"use strict";

// Repo-contract test: pins the cross-file invariants the flox environment and
// the shipped skills rely on. Nothing here executes flox or an agent — it
// checks the committed bytes agree with each other.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");

test("flox DIFFTREE_VERSION mirrors action.yml's difftree-version default", () => {
  const manifest = read(".flox", "env", "manifest.toml");
  const yml = read("action.yml");
  const floxVer = manifest.match(/^DIFFTREE_VERSION = "v([0-9.]+)"$/m);
  assert.ok(floxVer, "manifest.toml declares DIFFTREE_VERSION as a v-prefixed tag");
  const actionVer = yml.match(/  difftree-version:\n(?:.*\n)*?    default: "([0-9.]+)"/);
  assert.ok(actionVer, "action.yml declares a difftree-version default");
  assert.equal(floxVer[1], actionVer[1], "bump both together (see manifest comment)");
});

// Each shipped skill is discoverable on both agent paths and documented:
// .claude/skills/<name>/SKILL.md, a relative .agents/skills/<name> symlink
// pointing at it, and a docs/skills/<name>.md page.
for (const name of ["difftree-action-setup", "difftree-pr-body"]) {
  test(`skill ${name}: claude dir, agents symlink, docs page agree`, () => {
    const skillMd = path.join(root, ".claude", "skills", name, "SKILL.md");
    assert.ok(fs.existsSync(skillMd), "SKILL.md exists");
    const link = path.join(root, ".agents", "skills", name);
    assert.equal(
      fs.readlinkSync(link),
      path.join("..", "..", ".claude", "skills", name),
      "symlink is relative and targets the .claude skill dir"
    );
    assert.ok(fs.existsSync(path.join(root, "docs", "skills", `${name}.md`)), "docs page exists");
    const front = read(".claude", "skills", name, "SKILL.md");
    assert.match(front, new RegExp(`^name: ${name}$`, "m"), "frontmatter name matches dir");
  });
}

test("difftree-pr-body markers are consistent across skill and docs", () => {
  const skill = read(".claude", "skills", "difftree-pr-body", "SKILL.md");
  const docs = read("docs", "skills", "difftree-pr-body.md");
  for (const marker of ["<!-- difftree-pr-body:begin -->", "<!-- difftree-pr-body:end -->"]) {
    assert.ok(skill.includes(marker), `SKILL.md carries ${marker}`);
    assert.ok(docs.includes(marker), `docs page carries ${marker}`);
  }
});
