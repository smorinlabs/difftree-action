"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { countFromJson } = require("../scripts/files-changed.js");

test("countFromJson reads summary.files_changed", () => {
  assert.equal(
    countFromJson('{"schema_version":"difftree.v1","summary":{"files_changed":3}}'),
    3
  );
});

test("countFromJson returns 0 for a genuinely empty diff", () => {
  assert.equal(countFromJson('{"summary":{"files_changed":0}}'), 0);
});

test("countFromJson returns null (unknown) for invalid or unexpected JSON", () => {
  assert.equal(countFromJson("not json"), null, "invalid JSON -> null");
  assert.equal(countFromJson("{}"), null, "no summary -> null");
  assert.equal(countFromJson('{"summary":{}}'), null, "no files_changed -> null");
  assert.equal(countFromJson(""), null, "empty -> null");
});
