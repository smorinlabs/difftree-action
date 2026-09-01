"use strict";

// Sticky PR-comment logic for difftree-action (Phase 0).
//
// Pure helpers (composeBody / pickExisting / truncateTree) are unit-tested;
// upsertComment performs the GitHub I/O via the actions/github-script `github`
// client (so it is exercised with an injected fake in tests).

const MARKER = "<!-- difftree-action -->";
const HEADING = "🌳 difftree — changes in this PR";

// Self-attribution footer, appended unless the `advertise` input is 'false'.
// GitHub small-print style (<sub> + <a> both survive GitHub's comment
// sanitizer — verified against the rendered body_html).
const ADVERTISEMENT =
  '<sub>🌳 Get your own diff tree at <a href="https://github.com/smorinlabs/difftree-action">smorinlabs/difftree-action</a></sub>';

// GitHub caps issue/PR comment bodies at 65536 characters. Leave headroom for
// the marker, heading, code fences, and the truncation notice.
const GITHUB_COMMENT_LIMIT = 65536;
const SCAFFOLD_BUDGET = 768; // marker + heading + fences + truncation notice + ad footer

const TRUNCATION_NOTICE =
  "_Tree truncated to fit GitHub's comment size limit; see the action log for the full output._";

function truncateTree(tree, limit = GITHUB_COMMENT_LIMIT) {
  const budget = limit - SCAFFOLD_BUDGET;
  if (tree.length <= budget) return { tree, truncated: false };
  return { tree: tree.slice(0, budget), truncated: true };
}

// ---------------------------------------------------------------------------
// Colored rendering (GitHub inline math).
//
// GitHub renders `$`…`$` (dollar-backtick inline math) through MathJax into
// MathML that the browser draws natively. Every rule below was measured on
// GitHub on 2026-09-01 (smorinlabs/harness-kit issues #14–#20); see
// docs/superpowers/specs/2026-09-01-color-comment-design.md for the evidence
// and the list of approaches that do NOT work (arrays, \phantom, \unicode …).
//
// The colored body is ONLY ever produced for the posted comment. The `tree`
// output and the difftree invocation are untouched; this module receives the
// plain `--no-color` text and decorates it.

// A clean page renders ~145 inline expressions before GitHub gives up
// ("Unable to render expression"); the budget is per page and shared with any
// other math on the PR. 100 leaves margin. Owner decision, 2026-09-01.
const MAX_COLOR_EXPRESSIONS = 100;
// Upper bound on the colored section's markup size so long paths cannot push
// the comment past GITHUB_COMMENT_LIMIT on their own (leaves ≥ ~39 KB for the
// plain remainder).
const COLOR_BYTES_MAX = 24576;

// GitHub Primer mid-tones, readable in light and dark themes. Keys are the
// `colored::Color` names difftree uses (src/lib.rs, v0.3.1).
const PALETTE = {
  Green: "#2da44e",
  Yellow: "#bf8700",
  Red: "#cf222e",
  Blue: "#0969da",
  BrightBlue: "#218bff",
  Magenta: "#8250df",
  Cyan: "#1b7c83",
  BrightRed: "#a40e26",
  BrightYellow: "#9a6700",
  Gray: "#6e7781",
};

// Mirrors difftree `mark()` + `mark_color()` for MarkScheme::Symbol (v0.3.1).
const MARK_COLORS = {
  "●": "Green", // staged / committed
  "○": "Yellow", // unstaged
  "◐": "Cyan", // staged + unstaged
  "?": "Magenta", // untracked
  "↻": "Blue", // renamed
  "⧉": "BrightBlue", // copied
  "×": "Red", // deleted
  "◆": "Cyan", // typechanged
  "‼": "BrightRed", // conflicted
  "⚠": "BrightYellow", // unreadable
  "!": "Gray", // ignored
};

// Mirrors difftree `ChangeKind::color()` for the footer's kind labels.
const KIND_COLORS = {
  added: "Green",
  modified: "Yellow",
  deleted: "Red",
  renamed: "Blue",
  copied: "BrightBlue",
  typechanged: "Cyan",
  conflicted: "BrightRed",
  unreadable: "BrightYellow",
};

// Escapes for text inside \texttt{}. Only these forms render on GitHub:
// \textbackslash, \textasciicircum, \textasciitilde, \unicode, \char do not.
// A backslash has no text-mode form, so it closes \texttt{}, emits the math
// symbol, and reopens — callers always wrap the result in \texttt{…}.
const TEXTTT_ESCAPES = {
  "\\": "}\\backslash\\texttt{",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "%": "\\%",
  _: "\\_",
  "^": "\\^{}",
  "~": "\\~{}",
  " ": "~",
};

// GitHub's server-side autolinker runs INSIDE math source: a 7–40 hex token
// that matches a commit becomes <a class="commit-link">, "@name" a mention,
// "#123" an issue link — and the injected anchor corrupts the expression
// (seen on the header's merge-base SHA). Breaking such tokens across two
// \texttt{} groups renders identically and never forms a linkable token.
const GROUP_BREAK = "}\\texttt{";

function escapeTexttt(s) {
  return s
    .replace(/[\u0000-\u001f\u007f]/g, "?")
    .replace(/[\\{}$&#%_^~ ]/g, (c) => TEXTTT_ESCAPES[c])
    .replace(/[0-9a-f]{7,}/gi, (run) => run.match(/.{1,6}/g).join(GROUP_BREAK))
    .replace(/@(?=[A-Za-z0-9])/g, "@" + GROUP_BREAK)
    .replace(/\\#(?=\d)/g, "\\#" + GROUP_BREAK);
}

const tt = (s) => (s ? `\\texttt{${escapeTexttt(s)}}` : "");
const colored = (s, name) => `{\\color{${PALETTE[name]}}\\texttt{${escapeTexttt(s)}}}`;
const expression = (tex) => "$`" + tex + "`$";

// Color every `+N` green and `−N` red inside a fragment (churn counts).
function churn(s) {
  const out = [];
  let last = 0;
  for (const m of s.matchAll(/([+−]\d+)/g)) {
    out.push(tt(s.slice(last, m.index)));
    out.push(colored(m[1], m[1][0] === "+" ? "Green" : "Red"));
    last = m.index + m[1].length;
  }
  out.push(tt(s.slice(last)));
  return out.join("");
}

// difftree TerminalRenderer::node: "{prefix}{conn} {mark} {name}{metric}".
// The mark is a single glyph, or a space for directories; the metric is
// " +N −M" for files or " (N files, +N −M)" for directories. Names may contain
// spaces and " -> " (renames), so they are matched lazily up to the metric.
const TREE_LINE = /^((?:│   |    )*)(├──|└──) (.) (.*?)( \(\d+ files?, \+\d+ −\d+\)| \+\d+ −\d+)?$/u;
const HEADER_LINE = /^(PR: |Staged changes|Unstaged changes|Uncommitted changes|Range: |Against: )/;
// difftree: "{dirs} dirs touched · {N files changed (…)|N files <kind>} · +a −b"
const FOOTER_LINE = /^(?:\d+ dirs? touched · )?\d+ files? /;
const KIND_WORD = /\b(added|modified|deleted|renamed|copied|typechanged|conflicted|unreadable)\b/;

// The box-drawing "│" is not in the math monospace font, so its advance width
// differs from a "~" cell. A prefix group of four spaces (below the last child
// of a directory) would therefore not line up with a "│   " group. Rendering an
// invisible "│" in place of the first space keeps every depth the same width.
// (\phantom is banned on GitHub; \color{transparent} is not — probe I2.)
const SPACER = "{\\color{transparent}\\texttt{│}}";

function prefixTex(prefix, rest) {
  const out = [];
  let buf = "";
  for (let i = 0; i < prefix.length; i += 4) {
    const group = prefix.slice(i, i + 4);
    if (group === "    ") {
      out.push(tt(buf), SPACER);
      buf = "   ";
    } else {
      buf += group;
    }
  }
  out.push(tt(buf + rest));
  return out.join("");
}

function renderColorLine(line) {
  let m;
  if ((m = TREE_LINE.exec(line))) {
    const [, prefix, conn, mark, name, metric = ""] = m;
    const markTex = MARK_COLORS[mark] ? colored(mark, MARK_COLORS[mark]) : tt(mark);
    return expression(`${prefixTex(prefix, conn + " ")}${markTex}${tt(" " + name)}${churn(metric)}`);
  }
  if (HEADER_LINE.test(line)) return expression(colored(line, "Gray"));
  if (FOOTER_LINE.test(line)) {
    const parts = line.split(KIND_WORD);
    return expression(parts.map((p, i) => (i % 2 ? colored(p, KIND_COLORS[p]) : churn(p))).join(""));
  }
  return expression(tt(line));
}

function normalizeTree(tree) {
  return tree
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""));
}

// Decide how much of the tree gets color. Returns { mode: "plain", reason } when
// the whole body must be today's fenced form, else the pieces of the hybrid body:
// header/root/footer expressions (or null), `footerText` (the raw footer line,
// additive — used for the fold <summary>), `colored` expressions for the leading
// body lines, and `plain` — the remaining body lines for the fence.
function splitForColor(tree, { maxExpressions = MAX_COLOR_EXPRESSIONS, maxBytes = COLOR_BYTES_MAX } = {}) {
  const lines = normalizeTree(tree);
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  while (lines.length && lines[0] === "") lines.shift();
  if (!lines.length) return { mode: "plain", reason: "empty content" };

  let headerLine = null;
  let rootLine = null;
  let footerLine = null;
  if (HEADER_LINE.test(lines[0])) {
    headerLine = lines.shift();
    if (lines.length && lines[0] !== "" && !TREE_LINE.test(lines[0])) rootLine = lines.shift();
  }
  if (lines.length && FOOTER_LINE.test(lines[lines.length - 1])) {
    footerLine = lines.pop();
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
  }
  for (const l of [headerLine, rootLine, footerLine]) {
    if (l !== null && l.includes("`")) return { mode: "plain", reason: "backtick in header/root/footer" };
  }

  const body = lines;
  const header = headerLine === null ? null : renderColorLine(headerLine);
  const root = rootLine === null ? null : renderColorLine(rootLine);
  const footer = footerLine === null ? null : renderColorLine(footerLine);
  const fixed = [header, root, footer].filter(Boolean).length;

  let k = Math.min(maxExpressions - fixed, body.length);
  const tick = body.findIndex((l) => l.includes("`"));
  if (tick !== -1) k = Math.min(k, tick);
  if (k <= 0) return { mode: "plain", reason: "no colorable lines (backtick on the first line, or no body)" };

  const rendered = body.slice(0, k).map(renderColorLine);
  const fixedBytes = [header, root, footer].filter(Boolean).join("\n").length;
  let bytes = fixedBytes + rendered.join("\n").length + rendered.length;
  while (k > 0 && bytes > maxBytes) {
    k -= 1;
    bytes -= rendered[k].length + 1;
  }
  if (k <= 0) return { mode: "plain", reason: "oversized fixed lines" };

  return {
    mode: "color",
    header,
    root,
    footer,
    footerText: footerLine,
    colored: rendered.slice(0, k),
    plain: body.slice(k),
  };
}

function composeColorBody(tree, { truncated, heading, advertise }) {
  const split = splitForColor(tree);
  if (split.mode === "plain") return null;

  const lines = [MARKER, `### ${heading}`, ""];
  if (split.header) lines.push(split.header);
  if (split.root) lines.push(split.root);
  lines.push(...split.colored);

  let suffixTruncated = false;
  if (split.plain.length) {
    const notice = `_…and ${split.plain.length} more lines below (plain — GitHub renders a limited number of colored lines per page)._`;
    const coloredBytes = lines.join("\n").length + (split.footer ? split.footer.length + 2 : 0);
    const plainText = split.plain.join("\n");
    const r = truncateTree(plainText, GITHUB_COMMENT_LIMIT - coloredBytes - notice.length);
    suffixTruncated = r.truncated;
    lines.push(notice, "```", r.tree.replace(/\s+$/, ""), "```");
  }
  if (truncated || suffixTruncated) lines.push("", TRUNCATION_NOTICE);
  if (split.footer) lines.push("", split.footer);
  if (advertise) lines.push("", ADVERTISEMENT);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Foldable sections (v0.7.0). Spec:
// docs/superpowers/specs/2026-09-01-foldable-sections-design.md
// The plain fence and the colored tree each live in a <details> fold. Section
// states come from the `color-section` / `plain-section` inputs; the legacy
// `color: "false"` alias forces the colored section hidden and the byte-
// identical bare plain body.

const SECTION_STATES = ["open", "closed", "hidden"];
const PLAIN_SUMMARY = "📱 Plain text version (mobile / email)";
const COLOR_SUMMARY_FALLBACK = "🎨 Colored diff tree";
// Only a footer that fully matches difftree's footer grammar may become a
// <summary> (spec L.2); anything else uses the static fallback label.
const FOOTER_GRAMMAR =
  /^\d+ dirs? touched · \d+ files? (?:changed|added|modified|deleted|renamed|copied|typechanged|conflicted|unreadable)(?: \(\d+ [a-z]+(?: · \d+ [a-z]+)*\))? · \+\d+ −\d+$/;
// Raw HTML tag delimiters inside fold-bound math source decline the folds
// entirely (spec L.3) — the legacy bare body has no such exposure.
const HTML_TAG_GUARD = /<\/|<[A-Za-z]/;

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Single home for the fold invariants: blank line after <summary> and before
// </details> (probe J4: without them GitHub renders the content on one line).
function renderDetails({ open, summary, content }) {
  return `<details${open ? " open" : ""}>\n<summary>${summary}</summary>\n\n${content}\n\n</details>`;
}

// A fence hostile content cannot close: its delimiter is one backtick longer
// than the longest backtick run in the content (spec L.1). Used only in folded
// modes; the legacy bare body keeps its fixed ``` fence (golden contract).
function safeFence(text) {
  const runs = text.match(/`+/g) || [];
  const delim = "`".repeat(Math.max(3, ...runs.map((r) => r.length + 1)));
  return `${delim}\n${text}\n${delim}`;
}

// Resolve raw input strings to section states + warnings, in the deterministic
// order of spec C: validate values → apply the `color:"false"` alias → flag
// both-hidden. Warnings never change the golden legacy body.
function resolveSections({ color = true, colorSection = "open", plainSection = "closed" } = {}) {
  const warnings = [];
  let colorState = colorSection;
  let plainState = plainSection;
  if (!SECTION_STATES.includes(colorState)) {
    warnings.push(`invalid color-section value "${colorState}"; using "open"`);
    colorState = "open";
  }
  if (!SECTION_STATES.includes(plainState)) {
    warnings.push(`invalid plain-section value "${plainState}"; using "closed"`);
    plainState = "closed";
  }
  if (color === false) colorState = "hidden";
  if (colorState === "hidden" && plainState === "hidden") {
    warnings.push("both sections hidden; posting the plain comment");
  }
  return { colorState, plainState, warnings };
}

// The pre-v0.7.0 bodies, byte-identical (golden contract): bare plain fence,
// empty-diff text, and — via composeColorBody — the colored-only hybrid.
function composeLegacyBody(tree, { empty, truncated, heading, advertise }) {
  const lines = [MARKER, `### ${heading}`, ""];
  if (empty) {
    lines.push("_No file changes between the base and this PR._");
  } else {
    lines.push("```", tree.replace(/\s+$/, ""), "```");
    if (truncated) {
      lines.push("", TRUNCATION_NOTICE);
    }
  }
  if (advertise) {
    lines.push("", ADVERTISEMENT);
  }
  return lines.join("\n");
}

// Dual-fold assembly (spec K): measure all fixed markup exactly, then give the
// remaining capacity to the plain fold. Assembled once; never repaired by slice.
function composeFoldedBody(tree, split, { truncated, heading, advertise, colorState, plainState }) {
  const summary =
    split.footerText && FOOTER_GRAMMAR.test(split.footerText)
      ? `🌳 ${escapeHtml(split.footerText)}`
      : COLOR_SUMMARY_FALLBACK;

  const coloredParts = [];
  if (split.header) coloredParts.push(split.header);
  if (split.root) coloredParts.push(split.root);
  coloredParts.push(...split.colored);

  let coloredContent;
  let suffixTruncated = false;
  if (plainState === "hidden") {
    // Colored-only mode keeps today's hybrid inside the fold (notice + fenced
    // remainder + truncation notice), with the content-safe fence.
    if (split.plain.length) {
      const notice = `_…and ${split.plain.length} more lines below (plain — GitHub renders a limited number of colored lines per page)._`;
      const plainText = split.plain.join("\n");
      const fixedSoFar = coloredParts.join("\n").length + notice.length + (split.footer ? split.footer.length : 0) + 1024;
      const r = truncateTree(plainText, GITHUB_COMMENT_LIMIT - fixedSoFar);
      suffixTruncated = r.truncated;
      coloredParts.push(notice, safeFence(r.tree.replace(/\s+$/, "")));
    }
    if (truncated || suffixTruncated) coloredParts.push("", TRUNCATION_NOTICE);
    if (split.footer) coloredParts.push("", split.footer);
    coloredContent = coloredParts.join("\n");
    const fold = renderDetails({ open: colorState === "open", summary, content: coloredContent });
    const lines = [MARKER, `### ${heading}`, "", fold];
    if (advertise) lines.push("", ADVERTISEMENT);
    return lines.join("\n");
  }

  // Plain fold visible: the colored fold never duplicates the suffix — its
  // pointer names the plain fold above (spec I.1); the single truncation
  // notice lives in the plain fold (spec A).
  if (split.plain.length) {
    coloredParts.push(`_…and ${split.plain.length} more lines — see the plain text version above._`);
  }
  if (split.footer) coloredParts.push("", split.footer);
  coloredContent = coloredParts.join("\n");
  const coloredFold = renderDetails({ open: colorState === "open", summary, content: coloredContent });

  const plainFullText = tree.replace(/\s+$/, "");
  const assemble = (plainContent) => {
    const plainFold = renderDetails({
      open: plainState === "open",
      summary: PLAIN_SUMMARY,
      content: plainContent,
    });
    const lines = [MARKER, `### ${heading}`, "", plainFold, "", coloredFold];
    if (advertise) lines.push("", ADVERTISEMENT);
    return lines.join("\n");
  };

  // Fixed markup measured with an empty-content probe that carries the real
  // fence delimiter bytes for the full text (a truncated prefix never has a
  // longer backtick run than the full text, so the delimiter cannot grow).
  const probeFence = safeFence(plainFullText);
  const delimBytes = probeFence.length - plainFullText.length;
  const fixedBytes = assemble(safeFence("")).length - safeFence("").length + delimBytes + TRUNCATION_NOTICE.length + 2;
  const capacity = GITHUB_COMMENT_LIMIT - fixedBytes;

  let plainTree = "";
  let noticeNeeded = truncated;
  if (capacity <= SCAFFOLD_BUDGET) {
    noticeNeeded = true; // never call truncateTree with limit ≤ its reserve (negative slice)
  } else {
    const r = truncateTree(plainFullText, capacity);
    plainTree = r.tree.replace(/\s+$/, "");
    noticeNeeded = noticeNeeded || r.truncated;
  }
  const plainContent = safeFence(plainTree) + (noticeNeeded ? `\n\n${TRUNCATION_NOTICE}` : "");
  return assemble(plainContent);
}

function composeBody(tree, opts = {}) {
  const {
    empty = false,
    truncated = false,
    heading = HEADING,
    advertise = true,
    color = true,
    colorSection = "open",
    plainSection = "closed",
  } = opts;

  const { colorState, plainState, warnings } = resolveSections({ color, colorSection, plainSection });
  const legacyOpts = { empty, truncated, heading, advertise };
  const done = (body) => ({ body, warnings });

  if (empty || colorState === "hidden") return done(composeLegacyBody(tree, legacyOpts));

  // Renderer decline overrides the requested sections (spec M): legacy body + warning.
  const declineToLegacy = (reason) => {
    warnings.push(`colored rendering declined: ${reason}`);
    const r = truncateTree(tree);
    return r.truncated
      ? done(composeLegacyBody(r.tree, { ...legacyOpts, truncated: true }))
      : done(composeLegacyBody(tree, legacyOpts));
  };

  if (HTML_TAG_GUARD.test(tree)) return declineToLegacy("raw HTML tag delimiter in tree text");

  const split = splitForColor(tree);
  if (split.mode === "plain") return declineToLegacy(split.reason);

  return done(composeFoldedBody(tree, split, { truncated, heading, advertise, colorState, plainState }));
}

// Ownership predicate: a comment is action-owned only when the marker is its
// LEADING line (how composeBody writes it). A substring match would treat a user
// comment that merely quotes the marker as ours — and the dedupe path deletes,
// so a loose match could destroy user content.
function isOwned(body, marker = MARKER) {
  return typeof body === "string" && body.split(/\r?\n/, 1)[0] === marker;
}

function pickExisting(comments, marker = MARKER) {
  if (!Array.isArray(comments)) return undefined;
  return comments.find((c) => c && isOwned(c.body, marker));
}

// Find the action's prior comment(s) by marker, update one, and remove any
// duplicates. `github` is the actions/github-script client (has `.paginate`
// and `.rest`).
//
// The list-then-create check is a TOCTOU: two overlapping runs can both see no
// marker and both create a comment. Consumers should add PR-scoped workflow
// `concurrency` to prevent that race; as a self-healing backstop this keeps the
// OLDEST marker comment as canonical and deletes the rest, so duplicates never
// persist across runs.
async function upsertComment({ github, owner, repo, issueNumber, body, marker = MARKER }) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  // listComments returns oldest-first; keep [0] as canonical.
  const mine = comments.filter((c) => c && isOwned(c.body, marker));

  if (mine.length === 0) {
    const { data } = await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    return { action: "created", url: data.html_url, removed: 0 };
  }

  const [canonical, ...dupes] = mine;
  const { data } = await github.rest.issues.updateComment({
    owner,
    repo,
    comment_id: canonical.id,
    body,
  });
  // Duplicate cleanup is best-effort: the canonical comment is already updated,
  // so a failed delete (404 if a concurrent run removed it, or 403 if the token
  // can comment but not delete) must NOT fail the action.
  let removed = 0;
  for (const d of dupes) {
    try {
      await github.rest.issues.deleteComment({ owner, repo, comment_id: d.id });
      removed += 1;
    } catch {
      // ignore — leave the duplicate; a later run will retry the cleanup.
    }
  }
  return {
    action: dupes.length ? "deduped" : "updated",
    url: data.html_url,
    removed,
  };
}

module.exports = {
  MARKER,
  HEADING,
  ADVERTISEMENT,
  GITHUB_COMMENT_LIMIT,
  MAX_COLOR_EXPRESSIONS,
  COLOR_BYTES_MAX,
  PALETTE,
  MARK_COLORS,
  KIND_COLORS,
  escapeTexttt,
  renderColorLine,
  splitForColor,
  truncateTree,
  composeBody,
  resolveSections,
  renderDetails,
  safeFence,
  pickExisting,
  upsertComment,
};
