"use strict";

// render-body.js contract: the PR-body rendering is composeBody's output with
// the comment-ownership marker stripped — same folds, same color, same
// decline-to-plain behavior — plus a small argv surface.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { parseArgs, render } = require("../scripts/render-body.js");
const { MARKER, ADVERTISEMENT } = require("../scripts/comment.js");

const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "pr24-tree.txt"), "utf8");

test("renders the comment layout without the ownership marker", () => {
  const { body } = render(fixture, {});
  assert.ok(!body.includes(MARKER), "marker stripped");
  assert.ok(body.startsWith("### 🌳 difftree — changes in this PR"), "heading first");
  assert.ok(body.includes("📱 Plain text version (mobile / email)"), "plain fold present");
  assert.ok(body.includes("$`"), "colored inline-math expressions present");
  assert.ok(body.includes(ADVERTISEMENT), "advertise on by default, like the action");
});

test("--no-advertise and section states pass through", () => {
  const { body } = render(fixture, { advertise: false, colorSection: "hidden" });
  assert.ok(!body.includes(ADVERTISEMENT));
  assert.ok(!body.includes("$`"), "hidden color section falls back to plain fence");
});

test("empty tree renders the no-changes body", () => {
  const { body } = render("", {});
  assert.ok(body.includes("_No file changes between the base and this PR._"));
});

test("parseArgs accepts the documented surface and rejects the rest", () => {
  assert.deepEqual(parseArgs(["--color-section=closed", "--no-advertise"]).opts, {
    advertise: false,
    colorSection: "closed",
  });
  assert.ok(parseArgs(["--color-section=sideways"]).error);
  assert.ok(parseArgs(["--frobnicate"]).error);
});
