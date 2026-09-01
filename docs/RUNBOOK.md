# Phase 0 Acceptance Runbook

Manual verification for the Phase 0 composite action. Run before tagging a `v0`
release. References `GOAL.md` §7.3 (acceptance) and `PRD.md` §6.

## Prerequisites

- A test repository (or this repo) with the `Difftree PR Comment` workflow
  installed — `.github/workflows/difftree-pr-comment.yml` from
  `examples/difftree-pr-comment.yml` in a test repo; in this repo, the dogfood
  `.github/workflows/difftree.yml` — using `actions/checkout` with
  `fetch-depth: 0` and `permissions: { contents: read, pull-requests: write }`.

## Acceptance steps

1. **Open a PR** touching a few files across at least two directories.
   - ✅ Expect: exactly one comment containing the marker `<!-- difftree-action -->`,
     a `🌳 difftree — changes in this PR` heading, a **closed** fold labeled
     `📱 Plain text version (mobile / email)`, and an **open** fold whose
     summary is the `N dirs touched · N files changed · +N −M` stats line,
     holding the tree as colored rows (one inline-math expression per line).
     A bare fenced ASCII tree appears with `color-section: "hidden"`
     (or the deprecated `color: "false"`), and also as the automatic safety
     fallback when colored rendering declines (backticks or raw HTML tag text
     in the tree — a warning names the reason in the run log).
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

While reviewing step 1's comment, confirm the tree renders legibly:

- box-drawing characters (`├──`, `└──`, `│`) align, and every row starts at the
  same left edge (in color mode each line is one inline-math expression);
- git status marks (`●`, `○`, `?`, …) are readable **and colored** (green
  staged, yellow unstaged, blue renamed, red deleted); `+N` green, `−M` red;
- no stray ANSI escape sequences (the action passes `--no-color`);
- on a PR with more than ~100 tree lines, the comment shows the first lines in
  color, a one-line notice, the remainder in a plain code block, then the
  colored summary line — still one comment;
- with `color: "false"` the comment is the plain code block (byte-identical to
  the pre-v0.6.0 output).

If anything renders poorly, tune the difftree flags in `action.yml`'s
`Run difftree` step (`--format`, `--marks`) and re-verify. `--no-color` stays.
Color-rendering limits are documented in the README ("Color rendering — limits").

## Fold check (v0.7.0 foldable layout — the detailed procedure lives only here)

1. Desktop: the 📱 plain fold starts closed and the 🌳 stats fold starts open;
   expanding the plain fold shows the complete fenced tree; collapsing the
   colored fold still shows the stats line in its summary.
2. Mobile: expand the 📱 fold — the plain tree must be readable; the collapsed
   or expanded colored fold showing TeX source there is expected.
3. Large PR (> ~100 lines): the colored fold ends with
   `…and N more lines — see the plain text version above.` and the plain fold
   holds the full tree; exactly one truncation notice appears, in the plain
   fold, and only when the 65,536-char budget required it.
4. `plain-section: "hidden"`: the colored fold keeps the fenced remainder
   inside itself (pre-fold hybrid).

## Notes

- A fully scripted open→push→update E2E (programmatically creating a PR and
  asserting comment state) is deferred beyond Phase 0; the dogfood workflow on
  this repo's own PRs plus these manual steps cover Phase 0 acceptance.
