"use strict";

// Action-contract test (spec E): CI's smoke job runs with `comment: false`, so
// the comment step's inline adapter is never executed in CI. This test pins the
// wiring in action.yml textually; the dogfood PR comment is the live proof.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const yml = fs.readFileSync(path.join(__dirname, "..", "action.yml"), "utf8");

test("action.yml declares the section inputs with the agreed defaults", () => {
  assert.match(yml, /  color-section:\n(?:.*\n)*?    default: "open"/);
  assert.match(yml, /  plain-section:\n(?:.*\n)*?    default: "closed"/);
  assert.match(yml, /  color:\n    description: >-\n      DEPRECATED alias/);
});

test("comment step maps all three env values", () => {
  assert.ok(yml.includes("DIFFTREE_COLOR: ${{ inputs.color }}"));
  assert.ok(yml.includes("DIFFTREE_COLOR_SECTION: ${{ inputs.color-section }}"));
  assert.ok(yml.includes("DIFFTREE_PLAIN_SECTION: ${{ inputs.plain-section }}"));
});

test("adapter destructures { body, warnings }, logs warnings, and posts body only", () => {
  assert.ok(yml.includes("const { body, warnings } = mod.composeBody(tree, { empty, truncated, advertise, color, colorSection, plainSection });"));
  assert.ok(yml.includes("warnings.forEach((w) => core.warning(`difftree-action: ${w}`));"));
  assert.ok(yml.includes("const colorSection = process.env.DIFFTREE_COLOR_SECTION || 'open';"));
  assert.ok(yml.includes("const plainSection = process.env.DIFFTREE_PLAIN_SECTION || 'closed';"));
  const upsert = yml.slice(yml.indexOf("mod.upsertComment"), yml.indexOf("core.setOutput"));
  assert.ok(upsert.includes("body,") && !upsert.includes("warnings"), "upsert receives body only");
});

test("difftree invocation still passes --no-color (CLI untouched)", () => {
  assert.ok(yml.includes('difftree "--pr=origin/$BASE" --committed --no-color'));
});
