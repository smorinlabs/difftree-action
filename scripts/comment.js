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

function escapeTexttt(s) {
  return s
    .replace(/[\u0000-\u001f\u007f]/g, "?")
    .replace(/[\\{}$&#%_^~ ]/g, (c) => TEXTTT_ESCAPES[c]);
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

function renderColorLine(line) {
  let m;
  if ((m = TREE_LINE.exec(line))) {
    const [, prefix, conn, mark, name, metric = ""] = m;
    const markTex = MARK_COLORS[mark] ? colored(mark, MARK_COLORS[mark]) : tt(mark);
    return expression(`${tt(prefix + conn + " ")}${markTex}${tt(" " + name)}${churn(metric)}`);
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

// Decide how much of the tree gets color. Returns { mode: "plain" } when the
// whole body must be today's fenced form, else the pieces of the hybrid body:
// header/root/footer expressions (or null), `colored` expressions for the
// leading body lines, and `plain` — the remaining body lines for the fence.
function splitForColor(tree, { maxExpressions = MAX_COLOR_EXPRESSIONS, maxBytes = COLOR_BYTES_MAX } = {}) {
  const lines = normalizeTree(tree);
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  while (lines.length && lines[0] === "") lines.shift();
  if (!lines.length) return { mode: "plain" };

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
    if (l !== null && l.includes("`")) return { mode: "plain" };
  }

  const body = lines;
  const header = headerLine === null ? null : renderColorLine(headerLine);
  const root = rootLine === null ? null : renderColorLine(rootLine);
  const footer = footerLine === null ? null : renderColorLine(footerLine);
  const fixed = [header, root, footer].filter(Boolean).length;

  let k = Math.min(maxExpressions - fixed, body.length);
  const tick = body.findIndex((l) => l.includes("`"));
  if (tick !== -1) k = Math.min(k, tick);
  if (k <= 0) return { mode: "plain" };

  const rendered = body.slice(0, k).map(renderColorLine);
  const fixedBytes = [header, root, footer].filter(Boolean).join("\n").length;
  let bytes = fixedBytes + rendered.join("\n").length + rendered.length;
  while (k > 0 && bytes > maxBytes) {
    k -= 1;
    bytes -= rendered[k].length + 1;
  }
  if (k <= 0) return { mode: "plain" };

  return {
    mode: "color",
    header,
    root,
    footer,
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

function composeBody(tree, opts = {}) {
  const {
    empty = false,
    truncated = false,
    heading = HEADING,
    advertise = true,
    color = true,
  } = opts;

  if (color && !empty) {
    const body = composeColorBody(tree, { truncated, heading, advertise });
    if (body !== null) return body;
  }

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
  pickExisting,
  upsertComment,
};
