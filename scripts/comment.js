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
  const mine = comments.filter(
    (c) => c && typeof c.body === "string" && c.body.includes(marker)
  );

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
  GITHUB_COMMENT_LIMIT,
  truncateTree,
  composeBody,
  pickExisting,
  upsertComment,
};
