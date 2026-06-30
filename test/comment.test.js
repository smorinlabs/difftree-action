"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  MARKER,
  composeBody,
  pickExisting,
  truncateTree,
  upsertComment,
  GITHUB_COMMENT_LIMIT,
} = require("../scripts/comment.js");

test("composeBody embeds marker, heading, and a fenced tree", () => {
  const body = composeBody("├── a\n└── b", {});
  assert.ok(body.startsWith(MARKER), "must lead with the hidden marker");
  assert.match(body, /^### /m, "has a heading");
  assert.match(body, /```\n├── a\n└── b\n```/, "tree is inside a code fence");
  assert.ok(!body.includes("truncated"), "no truncation notice when not truncated");
});

test("composeBody empty case has no code fence and a no-changes line", () => {
  const body = composeBody("", { empty: true });
  assert.ok(body.startsWith(MARKER));
  assert.ok(!body.includes("```"), "no code fence for an empty diff");
  assert.match(body, /no file changes/i);
});

test("composeBody adds a truncation notice when truncated", () => {
  const body = composeBody("├── a", { truncated: true });
  assert.match(body, /```\n├── a\n```/);
  assert.match(body, /truncat/i);
});

test("pickExisting finds the comment carrying the marker", () => {
  const comments = [
    { id: 1, body: "unrelated" },
    { id: 2, body: `${MARKER}\nold tree` },
    { id: 3, body: "another" },
  ];
  assert.equal(pickExisting(comments).id, 2);
});

test("pickExisting returns undefined when no marker and tolerates bad input", () => {
  assert.equal(pickExisting([{ id: 1, body: "nope" }, { id: 2 }]), undefined);
  assert.equal(pickExisting([]), undefined);
  assert.equal(pickExisting(null), undefined);
});

test("truncateTree passes small trees through untouched", () => {
  const r = truncateTree("small");
  assert.equal(r.tree, "small");
  assert.equal(r.truncated, false);
});

test("truncateTree shortens trees over the limit and flags it", () => {
  const big = "x".repeat(GITHUB_COMMENT_LIMIT + 10);
  const r = truncateTree(big);
  assert.equal(r.truncated, true);
  assert.ok(r.tree.length < big.length);
  assert.ok(r.tree.length <= GITHUB_COMMENT_LIMIT);
});

// ---- upsertComment: inject a fake github-script client ----

function fakeGithub({ existing = [] } = {}) {
  const calls = { create: [], update: [] };
  return {
    calls,
    paginate: async () => existing,
    rest: {
      issues: {
        listComments: () => {},
        createComment: async (args) => {
          calls.create.push(args);
          return { data: { html_url: "https://x/new", id: 99 } };
        },
        updateComment: async (args) => {
          calls.update.push(args);
          return { data: { html_url: "https://x/upd", id: args.comment_id } };
        },
      },
    },
  };
}

test("upsertComment creates a new comment when none carries the marker", async () => {
  const gh = fakeGithub({ existing: [{ id: 1, body: "unrelated" }] });
  const res = await upsertComment({
    github: gh, owner: "o", repo: "r", issueNumber: 7, body: "hi",
  });
  assert.equal(res.action, "created");
  assert.equal(res.url, "https://x/new");
  assert.equal(gh.calls.create.length, 1);
  assert.equal(gh.calls.update.length, 0);
  assert.equal(gh.calls.create[0].issue_number, 7);
});

test("upsertComment updates the existing marker comment in place", async () => {
  const gh = fakeGithub({ existing: [{ id: 42, body: `${MARKER}\nold` }] });
  const res = await upsertComment({
    github: gh, owner: "o", repo: "r", issueNumber: 7, body: "new",
  });
  assert.equal(res.action, "updated");
  assert.equal(res.url, "https://x/upd");
  assert.equal(gh.calls.update.length, 1);
  assert.equal(gh.calls.create.length, 0);
  assert.equal(gh.calls.update[0].comment_id, 42);
  assert.equal(gh.calls.update[0].body, "new");
});
