"use strict";

// Tests for the colored (inline-math) PR comment body. Rendering rules and
// limits were measured against GitHub's renderer on 2026-09-01
// (smorinlabs/harness-kit issues #14–#20); see
// docs/superpowers/specs/2026-09-01-color-comment-design.md.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  MARKER,
  ADVERTISEMENT,
  GITHUB_COMMENT_LIMIT,
  MAX_COLOR_EXPRESSIONS,
  COLOR_BYTES_MAX,
  MARK_COLORS,
  PALETTE,
  escapeTexttt,
  renderColorLine,
  splitForColor,
  composeBody,
} = require("../scripts/comment.js");

const FIXTURE = fs.readFileSync(path.join(__dirname, "fixtures", "pr24-tree.txt"), "utf8");
const GOLDEN = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "plain-golden.json"), "utf8"));

const EXPR = /^\$`.*`\$$/;
const countExpressions = (body) => body.split("\n").filter((l) => EXPR.test(l)).length;

// Synthetic tree in difftree's real shape: header, root, body lines, blank, footer.
function synth(n, { header = true, footer = true, nameFor } = {}) {
  const marks = ["●", "●", "○", "↻", "×", "?", "◐", "●"];
  const lines = [];
  if (header) lines.push("PR: origin/main...abc1234 · committed", "repo");
  for (let i = 1; i <= n; i++) {
    const pre = "│   ".repeat(i % 4);
    const conn = i % 6 === 0 ? "└──" : "├──";
    const name = nameFor ? nameFor(i) : `file_${i}.ts`;
    lines.push(i % 8 === 0 ? `${pre}${conn}   dir_${i} (${i} files, +${i * 2} −${i})` : `${pre}${conn} ${marks[i % 8]} ${name} +${i * 2} −${i}`);
  }
  if (footer) lines.push("", `3 dirs touched · ${n} files changed (${n} modified) · +9 −3`);
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------- plain path

test("color:false reproduces today's body byte-for-byte (8-way golden matrix)", () => {
  for (const [key, expected] of Object.entries(GOLDEN)) {
    const opts = Object.fromEntries(key.split(",").map((kv) => { const [k, v] = kv.split("="); return [k, v === "true"]; }));
    const actual = composeBody(opts.empty ? "" : FIXTURE, { ...opts, color: false });
    assert.equal(actual, expected, `golden mismatch for ${key}`);
  }
});

test("empty diff ignores color and matches the plain body", () => {
  assert.equal(composeBody("", { empty: true, color: true }), GOLDEN["empty=true,truncated=false,advertise=true"]);
});

// ------------------------------------------------------------------ escaping

test("escapeTexttt handles every special character and passes safe ones through", () => {
  assert.equal(escapeTexttt("a b"), "a~b");
  assert.equal(escapeTexttt("a_b"), "a\\_b");
  assert.equal(escapeTexttt("#%&${}"), "\\#\\%\\&\\$\\{\\}");
  assert.equal(escapeTexttt("a^b"), "a\\^{}b");
  assert.equal(escapeTexttt("a~b"), "a\\~{}b");
  assert.equal(escapeTexttt("a\\b"), "a}\\backslash\\texttt{b");
  assert.equal(escapeTexttt("<>|'\"->--"), "<>|'\"->--");
  assert.equal(escapeTexttt("ünïcödé 日本"), "ünïcödé~日本");
  assert.equal(escapeTexttt("a\u0001b\u007fc"), "a?b?c", "control characters become ?");
});

test("every difftree mark glyph maps to a palette color", () => {
  for (const g of ["●", "○", "◐", "?", "↻", "⧉", "×", "◆", "‼", "⚠", "!"]) {
    assert.ok(MARK_COLORS[g], `mark ${g} unmapped`);
    assert.ok(PALETTE[MARK_COLORS[g]], `color ${MARK_COLORS[g]} missing from palette`);
  }
});

// ------------------------------------------------------------ line rendering

test("renderColorLine colors mark and churn on a file line, keeps prefix and name plain", () => {
  const e = renderColorLine("│   ├── ● index.ts +40 −5");
  assert.match(e, /^\$`.*`\$$/);
  assert.ok(e.includes("\\texttt{│~~~├──~}"), "prefix+connector plain");
  assert.ok(e.includes(`{\\color{${PALETTE.Green}}\\texttt{●}}`), "mark green");
  assert.ok(e.includes("\\texttt{~index.ts}"), "name plain");
  assert.ok(e.includes(`{\\color{${PALETTE.Green}}\\texttt{+40}}`), "+N green");
  assert.ok(e.includes(`{\\color{${PALETTE.Red}}\\texttt{−5}}`), "−M red");
});

test("renderColorLine handles directory rollups, renames with spaces, and a space mark", () => {
  const dir = renderColorLine("├──   docs (3 files, +54 −10)");
  assert.ok(dir.includes("\\texttt{~docs}"), "dir name");
  assert.ok(dir.includes(`{\\color{${PALETTE.Green}}\\texttt{+54}}`), "rollup + colored");
  assert.ok(!dir.includes("\\color{" + PALETTE.Green + "}\\texttt{~}"), "space mark not colored");
  const ren = renderColorLine("    └── ↻ old name.yml -> new name.yml +3 −3");
  assert.ok(ren.includes(`{\\color{${PALETTE.Blue}}\\texttt{↻}}`), "rename mark blue");
  assert.ok(ren.includes("\\texttt{~old~name.yml~->~new~name.yml}"), "name with spaces and arrow intact");
});

test("renderColorLine renders header gray, footer kinds+churn colored, unknown lines plain", () => {
  const header = renderColorLine("PR: origin/main...563a39c · committed");
  assert.ok(header.startsWith(`$\`{\\color{${PALETTE.Gray}}\\texttt{PR:~origin/main...563a39c~·~committed}}\`$`));
  const footer = renderColorLine("8 dirs touched · 8 files changed (7 modified · 1 renamed) · +101 −52");
  assert.ok(footer.includes(`{\\color{${PALETTE.Yellow}}\\texttt{modified}}`));
  assert.ok(footer.includes(`{\\color{${PALETTE.Blue}}\\texttt{renamed}}`));
  assert.ok(footer.includes(`{\\color{${PALETTE.Green}}\\texttt{+101}}`));
  assert.ok(footer.includes(`{\\color{${PALETTE.Red}}\\texttt{−52}}`));
  assert.equal(renderColorLine("warning: something odd"), "$`\\texttt{warning:~something~odd}`$");
  // single-kind footer form (difftree lib.rs test: "0 dirs touched · 2 files modified · +2 −0")
  const single = renderColorLine("0 dirs touched · 2 files modified · +2 −0");
  assert.ok(single.includes(`{\\color{${PALETTE.Yellow}}\\texttt{modified}}`));
  const r = splitForColor("PR: x...y · committed\nrepo\n├── ● a.ts +2 −0\n\n0 dirs touched · 1 files added · +2 −0\n");
  assert.ok(r.footer && r.footer.includes(`{\\color{${PALETTE.Green}}\\texttt{added}}`), "single-kind footer detected and colored");
});

// ------------------------------------------------------------------ fixture

test("PR #24 fixture renders every line as one expression with expected colors", () => {
  const body = composeBody(FIXTURE, { color: true });
  const lines = FIXTURE.trimEnd().split("\n").filter((l) => l !== "");
  assert.equal(countExpressions(body), lines.length, "one expression per non-empty line");
  assert.ok(body.startsWith(MARKER + "\n"), "marker first");
  assert.ok(!body.includes("```"), "no fence when everything fits");
  assert.ok(body.includes("\\texttt{~SKILL.md}"));
  assert.ok(body.includes("\\texttt{~pr-diff-tree.yml~->~difftree-pr-comment.yml}"));
  assert.ok(body.endsWith(ADVERTISEMENT));
  assert.ok(!body.includes("<br>"));
});

// -------------------------------------------------------------------- split

test("small tree: all colored, no notice, no fence; footer is the last expression", () => {
  const r = splitForColor(synth(20));
  assert.equal(r.mode, "color");
  assert.equal(r.plain.length, 0);
  assert.equal(r.colored.length, 20);
  assert.ok(r.header && r.root && r.footer);
});

test("large tree splits at the expression budget and keeps the footer colored", () => {
  const body = composeBody(synth(500), { color: true });
  assert.equal(countExpressions(body), MAX_COLOR_EXPRESSIONS);
  const fixed = 3; // header, root, footer
  const k = MAX_COLOR_EXPRESSIONS - fixed;
  assert.ok(body.includes(`…and ${500 - k} more lines below`), "notice names the remainder");
  const fence = body.split("```");
  assert.equal(fence.length, 3, "exactly one fence");
  const fenced = fence[1].trim().split("\n");
  assert.equal(fenced.length, 500 - k);
  assert.ok(fenced[0].includes(`file_${k + 1}.ts`) || fenced[0].includes(`dir_${k + 1}`), "fence starts right after the colored lines");
  const after = fence[2];
  assert.match(after, /\$`.*files~changed.*`\$/, "footer expression after the fence");
  assert.ok(body.length <= GITHUB_COMMENT_LIMIT);
});

test("backtick in a body line moves it and everything after into the fence", () => {
  const tree = synth(60, { nameFor: (i) => (i === 41 ? "we`ird.ts" : `file_${i}.ts`) });
  const r = splitForColor(tree);
  assert.equal(r.mode, "color");
  assert.equal(r.colored.length, 40);
  assert.equal(r.plain.length, 20);
  assert.ok(r.plain[0].includes("we`ird.ts"));
  const body = composeBody(tree, { color: true });
  for (const l of body.split("\n")) if (EXPR.test(l)) assert.ok(!l.slice(2, -2).includes("`"), "no backtick inside an expression");
});

test("backtick on the first body line, or in header/root/footer, yields today's plain body", () => {
  const first = synth(5, { nameFor: (i) => (i === 1 ? "a`b" : `f${i}`) });
  assert.equal(composeBody(first, { color: true }), composeBody(first, { color: false }));
  const rootTick = synth(5).replace("\nrepo\n", "\nre`po\n");
  assert.equal(composeBody(rootTick, { color: true }), composeBody(rootTick, { color: false }));
  const footTick = synth(5).replace("files changed", "files ch`anged");
  assert.equal(composeBody(footTick, { color: true }), composeBody(footTick, { color: false }));
});

test("absent header/footer shrink the fixed count so more body lines get color", () => {
  const r = splitForColor(synth(200, { header: false, footer: false }));
  assert.equal(r.header, null);
  assert.equal(r.footer, null);
  assert.equal(r.colored.length, MAX_COLOR_EXPRESSIONS);
});

test("long paths: colored section is bounded by COLOR_BYTES_MAX and total stays under the limit", () => {
  const tree = synth(300, { nameFor: (i) => "deep/".repeat(60) + `f_${i}.ts` });
  const r = splitForColor(tree);
  assert.equal(r.mode, "color");
  assert.ok(r.colored.length < MAX_COLOR_EXPRESSIONS - 3, "k reduced below the expression budget");
  const coloredBytes = [r.header, r.root, ...r.colored, r.footer].filter(Boolean).join("\n").length;
  assert.ok(coloredBytes <= COLOR_BYTES_MAX, `colored bytes ${coloredBytes}`);
  const body = composeBody(tree, { color: true });
  assert.ok(body.length <= GITHUB_COMMENT_LIMIT, `body ${body.length}`);
});

test("plain suffix over budget is truncated with today's notice; colored lines untouched", () => {
  const tree = synth(1000, { nameFor: (i) => "x".repeat(400) + `_${i}.ts` });
  const body = composeBody(tree, { color: true });
  assert.ok(body.length <= GITHUB_COMMENT_LIMIT, `body ${body.length}`);
  assert.match(body, /Tree truncated to fit GitHub's comment size limit/);
  const r = splitForColor(tree);
  for (const e of r.colored) assert.ok(body.includes(e), "every colored expression survives intact");
});

test("upstream-truncated input keeps the truncation notice in color mode", () => {
  const body = composeBody(synth(300), { color: true, truncated: true });
  assert.match(body, /Tree truncated to fit GitHub's comment size limit/);
});

test("CRLF and trailing whitespace normalize to the LF output", () => {
  const lf = synth(30);
  const crlf = lf.split("\n").map((l) => l + "   ").join("\r\n");
  assert.equal(composeBody(crlf, { color: true }), composeBody(lf, { color: true }));
});

test("advertise:false drops the footer in color mode too", () => {
  const body = composeBody(FIXTURE, { color: true, advertise: false });
  assert.ok(!body.includes("<sub>"));
});
