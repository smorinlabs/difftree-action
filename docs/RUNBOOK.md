# Phase 0 Acceptance Runbook

Manual verification for the Phase 0 composite action. Run before tagging a `v0`
release. References `GOAL.md` §7.3 (acceptance) and `PRD.md` §6.

## Prerequisites

- A test repository (or this repo) with the `PR Diff Tree` workflow
  (`.github/workflows/difftree.yml`) installed, using `actions/checkout` with
  `fetch-depth: 0` and `permissions: { contents: read, pull-requests: write }`.

## Acceptance steps

1. **Open a PR** touching a few files across at least two directories.
   - ✅ Expect: exactly one comment containing the marker `<!-- difftree-action -->`,
     a `🌳 difftree — changes in this PR` heading, and a fenced ASCII tree with a
     `N dirs touched · N files changed · +N −M` summary line.
2. **Push another commit** to the same PR.
   - ✅ Expect: the **same** comment updates in place — no second difftree-action
     comment appears.
3. **Check the run outputs / job summary.**
   - ✅ Expect: the job summary shows the base ref, files-changed count, and the
     comment URL. The `tree` and `files-changed` outputs are populated.
4. **`comment: false` variant** (e.g. the CI `smoke` job).
   - ✅ Expect: outputs are set, the run succeeds, and **no** comment is posted.
5. **Fork PR** (open a PR from a fork).
   - ✅ Expect: the check stays green; a warning is logged that the read-only token
     prevented commenting; no comment is posted. (See `PRD.md` §9.)

## Rendering-flag check (resolves PRD OQ1 / GOAL OI3)

While reviewing step 1's comment, confirm the tree renders legibly in GitHub's
markdown code block:

- box-drawing characters (`├──`, `└──`, `│`) align in the monospace block;
- git status marks (`●`, `○`, `?`, …) are readable;
- no stray ANSI escape sequences (the action passes `--no-color`).

If anything renders poorly, tune the difftree flags in `action.yml`'s
`Run difftree` step (`--format`, `--marks`) and re-verify. `--no-color` stays.

## Notes

- A fully scripted open→push→update E2E (programmatically creating a PR and
  asserting comment state) is deferred beyond Phase 0; the dogfood workflow on
  this repo's own PRs plus these manual steps cover Phase 0 acceptance.
