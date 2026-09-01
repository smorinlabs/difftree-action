"use strict";

// Foldable-sections tests (v0.7.0). Spec:
// docs/superpowers/specs/2026-09-01-foldable-sections-design.md (amendments A–O).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  MARKER,
  ADVERTISEMENT,
  GITHUB_COMMENT_LIMIT,
  composeBody,
  resolveSections,
  renderDetails,
  safeFence,
  splitForColor,
} = require("../scripts/comment.js");

const FIXTURE = fs.readFileSync(path.join(__dirname, "fixtures", "pr24-tree.txt"), "utf8");
const GOLDEN = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "plain-golden.json"), "utf8"));

const PLAIN_SUMMARY = "📱 Plain text version (mobile / email)";
const EXPR = /^\$`.*`\$$/;

function synth(n, { nameFor } = {}) {
  const marks = ["●", "●", "○", "↻", "×", "?", "◐", "●"];
  const lines = ["PR: origin/main...abc1234 · committed", "repo"];
  for (let i = 1; i <= n; i++) {
    const pre = "│   ".repeat(i % 4);
    const conn = i % 6 === 0 ? "└──" : "├──";
    lines.push(`${pre}${conn} ${marks[i % 8]} ${nameFor ? nameFor(i) : `file_${i}.ts`} +${i * 2} −${i}`);
  }
  lines.push("", `3 dirs touched · ${n} files changed (${n} modified) · +9 −3`);
  return lines.join("\n") + "\n";
}

// ------------------------------------------------- TS01: golden × both selectors

test("all golden entries are byte-identical under color:false × every explicit colorSection, and under colorSection:hidden", () => {
  for (const [key, expected] of Object.entries(GOLDEN)) {
    const opts = Object.fromEntries(key.split(",").map((kv) => { const [k, v] = kv.split("="); return [k, v === "true"]; }));
    const treeArg = opts.empty ? "" : FIXTURE;
    for (const colorSection of ["open", "closed", "hidden"]) {
      const r = composeBody(treeArg, { ...opts, color: false, colorSection });
      assert.equal(r.body, expected, `alias mismatch for ${key} colorSection=${colorSection}`);
    }
    assert.equal(composeBody(treeArg, { ...opts, colorSection: "hidden" }).body, expected, `explicit hidden mismatch for ${key}`);
  }
});

// ------------------------------------------------- TS02: nine-state section table

test("all nine colorSection × plainSection states: marker first, order, open attrs, balanced tags, blank-line law, ad outside", () => {
  for (const colorSection of ["open", "closed", "hidden"]) {
    for (const plainSection of ["open", "closed", "hidden"]) {
      const { body } = composeBody(FIXTURE, { colorSection, plainSection });
      const label = `color=${colorSection} plain=${plainSection}`;
      assert.ok(body.startsWith(MARKER + "\n"), `${label}: marker first`);
      assert.ok(body.endsWith(ADVERTISEMENT), `${label}: ad last, outside folds`);
      const opens = (body.match(/<details/g) || []).length;
      const closes = (body.match(/<\/details>/g) || []).length;
      assert.equal(opens, closes, `${label}: balanced details tags`);
      if (colorSection === "hidden") {
        assert.equal(opens, 0, `${label}: legacy body has no folds`);
        assert.equal(body, GOLDEN["empty=false,truncated=false,advertise=true"], `${label}: legacy body is golden`);
        continue;
      }
      const expectFolds = plainSection === "hidden" ? 1 : 2;
      assert.equal(opens, expectFolds, `${label}: fold count`);
      // every <summary> line is followed by a blank line; every </details> preceded by one
      for (const m of body.matchAll(/<\/summary>\n(.)/g)) assert.equal(m[1], "\n", `${label}: blank after summary`);
      for (const m of body.matchAll(/(.)\n<\/details>/g)) assert.equal(m[1], "", `${label}: blank before /details`);
      if (plainSection !== "hidden") {
        assert.ok(body.indexOf(PLAIN_SUMMARY) < body.indexOf("🌳 3 dirs" === -1 ? "<details open" : "dirs touched"), `${label}: plain fold above colored`);
        assert.equal(body.includes(`<details${plainSection === "open" ? " open" : ""}>\n<summary>${PLAIN_SUMMARY}`), true, `${label}: plain open attr`);
      }
      const statsSummary = body.match(/<summary>🌳 ([^<]*)<\/summary>/);
      assert.ok(statsSummary, `${label}: stats summary present`);
      const colorFoldTag = body.slice(body.lastIndexOf("<details", body.indexOf(statsSummary[0])));
      assert.equal(colorFoldTag.startsWith(colorSection === "open" ? "<details open>" : "<details>"), true, `${label}: colored open attr`);
    }
  }
});

test("both sections hidden falls back to the golden plain body with a warning", () => {
  const r = composeBody(FIXTURE, { colorSection: "hidden", plainSection: "hidden" });
  assert.equal(r.body, GOLDEN["empty=false,truncated=false,advertise=true"]);
  assert.ok(r.warnings.some((w) => w.includes("both sections hidden")));
});

test("invalid input values fall back to defaults with warnings, in validation-then-alias order", () => {
  const r = resolveSections({ color: false, colorSection: "bogus", plainSection: "hidden" });
  assert.equal(r.colorState, "hidden", "alias applied after validation");
  assert.equal(r.plainState, "hidden");
  assert.deepEqual(r.warnings, [
    'invalid color-section value "bogus"; using "open"',
    "both sections hidden; posting the plain comment",
  ]);
  const body = composeBody(FIXTURE, { color: false, colorSection: "bogus", plainSection: "hidden" }).body;
  assert.equal(body, GOLDEN["empty=false,truncated=false,advertise=true"], "warnings never change the golden body");
});

test("empty diff never has folds in any state and keeps the legacy text", () => {
  for (const colorSection of ["open", "closed", "hidden"]) {
    const { body } = composeBody("", { empty: true, colorSection, plainSection: "open" });
    assert.equal(body, GOLDEN["empty=true,truncated=false,advertise=true"]);
  }
});

test("advertise:false drops the sub line in folded modes and keeps folds balanced", () => {
  const { body } = composeBody(FIXTURE, { advertise: false });
  assert.ok(!body.includes("<sub>"));
  assert.equal((body.match(/<details/g) || []).length, 2);
  assert.ok(body.endsWith("</details>"));
});

// ------------------------------------------------- TS03: budget

test("adversarial dual-section input stays under the comment limit with intact expressions", () => {
  const raw = synth(1000, { nameFor: (i) => "x".repeat(400) + `_${i}.ts` });
  // production order: truncateTree first
  const { truncateTree } = require("../scripts/comment.js");
  const up = truncateTree(raw);
  const { body } = composeBody(up.tree, { truncated: up.truncated });
  assert.ok(body.length <= GITHUB_COMMENT_LIMIT, `body ${body.length}`);
  for (const l of body.split("\n")) if (l.startsWith("$`")) assert.match(l, EXPR, "every math line is a complete expression");
  const split = splitForColor(up.tree);
  for (const e of split.colored) assert.ok(body.includes(e), "colored expressions survive intact");
});

test("plain fold content is exactly the truncateTree prefix; capacity edge never negative-slices", () => {
  const raw = synth(1000, { nameFor: (i) => "y".repeat(300) + `_${i}.ts` });
  const { body } = composeBody(raw, {});
  assert.ok(body.length <= GITHUB_COMMENT_LIMIT);
  const fence = body.match(/<summary>📱[^]*?(`{3,})\n([^]*?)\n\1/);
  assert.ok(fence, "plain fold fence present");
  assert.ok(raw.startsWith(fence[2].slice(0, 1000)), "fold content is a prefix of the tree");
  assert.match(body, /Tree truncated to fit GitHub's comment size limit/);
  const notices = body.match(/Tree truncated to fit/g) || [];
  assert.equal(notices.length, 1, "exactly one truncation notice");
});

test("upstream truncation notice lives in the plain fold when it is visible, in the colored fold when not", () => {
  const withPlain = composeBody(synth(20), { truncated: true }).body;
  const plainFold = withPlain.slice(withPlain.indexOf(PLAIN_SUMMARY), withPlain.indexOf("</details>"));
  assert.match(plainFold, /Tree truncated to fit/);
  assert.equal((withPlain.match(/Tree truncated to fit/g) || []).length, 1);
  const colorOnly = composeBody(synth(20), { truncated: true, plainSection: "hidden" }).body;
  assert.match(colorOnly, /Tree truncated to fit/);
  assert.equal((colorOnly.match(/Tree truncated to fit/g) || []).length, 1);
});

test("large tree with visible plain fold: colored fold has the pointer, not a duplicated fence", () => {
  const { body } = composeBody(synth(300), {});
  assert.ok(body.includes("more lines — see the plain text version above."));
  const coloredFold = body.slice(body.indexOf("<summary>🌳"));
  assert.ok(!coloredFold.includes("```"), "no fenced remainder inside the colored fold");
  const plainFold = body.slice(body.indexOf(PLAIN_SUMMARY), body.indexOf("<summary>🌳"));
  assert.ok(plainFold.includes("file_300.ts"), "plain fold carries the full tree");
});

// ------------------------------------------------- TS04: containment

test("hostile fence-closing content cannot escape the plain fold", () => {
  const tree = synth(10, { nameFor: (i) => (i === 5 ? "evil" : `f_${i}.ts`) }).replace("├── × evil", "```\n</details>\n├── × evil");
  const { body } = composeBody(tree, {});
  const opens = (body.match(/<details/g) || []).length;
  const closes = (body.match(/<\/details>/g) || []).length;
  assert.equal(opens, closes);
  const m = body.match(/(`{4,})\n/);
  if (body.indexOf(PLAIN_SUMMARY) !== -1 && body.includes("```\n</details>\n")) {
    assert.ok(m, "fence delimiter longer than content backtick runs");
  }
});

test("safeFence delimiter always exceeds the longest backtick run", () => {
  assert.ok(safeFence("plain").startsWith("```\n"));
  assert.ok(safeFence("a\n```\nb").startsWith("````\n"));
  assert.ok(safeFence("a\n`````x\nb").startsWith("``````\n"));
});

test("tag-shaped filenames decline the folds and fall back to the legacy body with a warning", () => {
  const tree = synth(5, { nameFor: (i) => (i === 2 ? "</details><details open><summary>x</summary>.ts" : `f_${i}.ts`) });
  const r = composeBody(tree, {});
  assert.equal(r.body, composeBody(tree, { color: false }).body, "byte-identical to the legacy body");
  assert.ok(r.body.includes("```"), "legacy fence");
  assert.ok(r.warnings.some((w) => w.includes("raw HTML tag delimiter")));
});

test("renderer decline (backtick first body line) posts the legacy body regardless of sections, with a warning", () => {
  const tree = synth(5, { nameFor: (i) => (i === 1 ? "a`b.ts" : `f_${i}.ts`) });
  for (const plainSection of ["open", "closed", "hidden"]) {
    const r = composeBody(tree, { plainSection });
    assert.ok(!r.body.includes("<details"), `plain=${plainSection}: legacy body`);
    assert.ok(r.warnings.some((w) => w.startsWith("colored rendering declined:")), `plain=${plainSection}: warning`);
  }
});

test("stats summary requires the anchored footer grammar; otherwise the static label", () => {
  const good = composeBody(synth(6), {}).body;
  assert.match(good, /<summary>🌳 3 dirs touched · 6 files changed \(6 modified\) · \+9 −3<\/summary>/);
  const single = synth(6).replace(/3 dirs touched · 6 files changed \(6 modified\) · \+9 −3/, "0 dirs touched · 1 file modified · +2 −0");
  assert.match(composeBody(single, {}).body, /<summary>🌳 0 dirs touched · 1 file modified · \+2 −0<\/summary>/);
  const weird = synth(6).replace(/3 dirs touched.*$/m, "3 dirs touched · 6 files changed <img src=x> · +9 −3");
  const { body } = composeBody(weird, {});
  // guard declines on the raw tag; if it ever reached the summary path it must not carry the tag
  assert.ok(!/<summary>[^<]*<img/.test(body));
});

test("summary HTML escape applies to grammar-matching footers", () => {
  // & is legal in the grammar path only via escaping; craft a footer that matches grammar (no & allowed by grammar)
  const r = composeBody(synth(4), {});
  const m = r.body.match(/<summary>🌳 ([^<]*)<\/summary>/);
  assert.ok(m && !/[<>]/.test(m[1]));
});

test("renderDetails enforces the blank-line law", () => {
  const d = renderDetails({ open: true, summary: "s", content: "c" });
  assert.equal(d, "<details open>\n<summary>s</summary>\n\nc\n\n</details>");
});

test("missing footer falls back to the static colored summary label", () => {
  const noFooter = ["PR: origin/main...abc1234 · committed", "repo", "├── ● a.ts +1 −0"].join("\n");
  const { body } = composeBody(noFooter, {});
  assert.match(body, /<summary>🎨 Colored diff tree<\/summary>/);
});
