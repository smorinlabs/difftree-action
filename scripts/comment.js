"use strict";

// Sticky PR-comment logic for difftree-action (Phase 0).
//
// Pure helpers (composeBody / pickExisting / truncateTree) are unit-tested;
// upsertComment performs the GitHub I/O via the actions/github-script `github`
// client (so it is exercised with an injected fake in tests).

const MARKER = "<!-- difftree-action -->";
const HEADING = "🌳 difftree — changes in this PR";

// GitHub caps issue/PR comment bodies at 65536 characters. Leave headroom for
// the marker, heading, code fences, and the truncation notice.
const GITHUB_COMMENT_LIMIT = 65536;
const SCAFFOLD_BUDGET = 512;

function truncateTree(tree, limit = GITHUB_COMMENT_LIMIT) {
  const budget = limit - SCAFFOLD_BUDGET;
  if (tree.length <= budget) return { tree, truncated: false };
  return { tree: tree.slice(0, budget), truncated: true };
}

function composeBody(tree, opts = {}) {
  const { empty = false, truncated = false, heading = HEADING } = opts;
  const lines = [MARKER, `### ${heading}`, ""];

  if (empty) {
    lines.push("_No file changes between the base and this PR._");
    return lines.join("\n");
  }

  lines.push("```", tree.replace(/\s+$/, ""), "```");
  if (truncated) {
    lines.push(
      "",
      "_Tree truncated to fit GitHub's comment size limit; see the action log for the full output._"
    );
  }
  return lines.join("\n");
}

function pickExisting(comments, marker = MARKER) {
  if (!Array.isArray(comments)) return undefined;
  return comments.find(
    (c) => c && typeof c.body === "string" && c.body.includes(marker)
  );
}

// Find the action's prior comment by marker and update it, else create one.
// `github` is the actions/github-script client (has `.paginate` and `.rest`).
async function upsertComment({ github, owner, repo, issueNumber, body, marker = MARKER }) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const existing = pickExisting(comments, marker);
  if (existing) {
    const { data } = await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    return { action: "updated", url: data.html_url };
  }

  const { data } = await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
  return { action: "created", url: data.html_url };
}

module.exports = {
  MARKER,
  HEADING,
  GITHUB_COMMENT_LIMIT,
  truncateTree,
  composeBody,
  pickExisting,
  upsertComment,
};
