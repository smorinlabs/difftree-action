# difftree-action fleet rollout — findings log

Append-only log of gotchas found while piloting the `difftree-action-setup`
skill across `smorinlabs` repos (PROJECTS.md P03). One entry per finding.
Each entry: where it surfaced, what happened, what the fix was, and whether
the fix is **skill**, **action**, **docs**, or **repo-local** (no skill change).

Fan-out gate: three consecutive pilot repos with zero **skill** entries.

## Pre-pilot (banked 2026-08-29, before pilot 1)

### F01 — `difftree-action-test` workflow file name drifted from canonical
- **Where:** `smorinlabs/difftree-action-test`, `.github/workflows/difftree.yml`
- **What:** The repo was wired by hand before the skill existed; the file is
  `difftree.yml`, not the `pr-diff-tree.yml` the skill scaffolds. A second skill
  run on that repo would add a second workflow instead of replacing the first.
- **Fix:** Skill section 2 now checks for an existing workflow that uses
  `smorinlabs/difftree-action` and replaces it in place. The test repo rename
  is P03-T07.
- **Class:** skill + repo-local

### F02 — Skill stopped at "report the PR URL"; no verification step
- **Where:** `.claude/skills/difftree-action-setup/SKILL.md` section 3
- **What:** Nothing told the agent to wait for the run, confirm the comment,
  confirm it self-updates, merge, or fast-forward the main checkout — the
  exact work the rollout has to validate per repo.
- **Fix:** New section 4 "Verify on the PR, then merge" (P03-T01).
- **Class:** skill

### F03 — Action installs a stale difftree by default
- **Where:** `action.yml` `difftree-version` default (`0.3.0`, also the shell
  fallback on line ~83) and README ×2; `examples/pr-diff-tree.yml` already
  said `0.3.1`. `gh release view --repo smorinlabs/difftree` → `v0.3.1`.
- **Fix:** Default bumped to `0.3.1` (P03-T02). Reaches `@v0` consumers only
  after the next difftree-action release moves the `v0` tag.
- **Class:** action + docs
- **Closed:** v0.4.0 released (PR #12 merged `8fbc74d7`); `v0` now at
  `8fbc74d75ecdec41890a944d2ddf504ea7ae5a2f`, `action.yml` default confirmed
  `"0.3.1"` at `@v0`.

### F04 — `difftree-action` already dogfoods itself
- **Where:** `smorinlabs/difftree-action`, `.github/workflows/difftree.yml` (`uses: ./`)
- **What:** The action's own repo runs the action from the local checkout —
  correct for the action repo (it tests the PR's own code), so the canonical
  `@v0` workflow must *not* replace it.
- **Fix:** P03 row for `difftree-action` = keep as is (no install).
- **Class:** repo-local

## Pilot 1 — `worktreeflow` (2026-08-29/30)

**Result:** action worked end to end — [PR #22](https://github.com/smorinlabs/worktreeflow/pull/22),
[run 33292566312](https://github.com/smorinlabs/worktreeflow/actions/runs/33292566312) (79 s),
comment `5466701979` posted and self-updated on the second push, merged `9c63d8d`.
**Not a no-gotchas run:** four skill edits needed (F05, F07, F08, F14).
Consecutive-clean counter: 0 of 3.

### F05 — Skill's relative template path was wrong
- **Where:** SKILL.md §2 step 2: `../../examples/pr-diff-tree.yml`
- **What:** From `.claude/skills/<name>/` two levels up is `.claude/`, not the
  repo root. Failed from every placement; also needs symlink-physical
  resolution for dev-symlinked installs.
- **Fix:** Resolver snippet — `cd <skill-dir> && pwd -P`, walk up ≤4 levels
  for a dir holding both `action.yml` and `examples/pr-diff-tree.yml`, else
  fetch `main`. Tested from in-repo Claude, in-repo Codex symlink, `~/.claude`
  and `~/.agents` dev symlinks, and a copied-out placement (→ fallback).
- **Class:** skill

### F06 — Raw-URL fallback at `@v0` serves stale bytes
- **Where:** fallback URL `.../difftree-action/v0/examples/pr-diff-tree.yml`
- **What:** `v0` still points at v0.3.0, whose example header names the old
  `setup-difftree` skill — one line differs from `main`. Consumers would get a
  non-canonical file.
- **Fix:** Fallback now fetches `main` (the fleet invariant is
  byte-identical-to-main). The remaining half — `@v0` consumers still install
  difftree 0.3.0 — closes when the pending release-please PR merges and moves
  `v0` (P03-T44).
- **Class:** skill (fallback URL) + action release
- **Closed:** v0.4.0 released (PR #12 merged `8fbc74d7`); `v0` moved to
  `8fbc74d75ecdec41890a944d2ddf504ea7ae5a2f`, `examples/pr-diff-tree.yml` at
  `@v0` confirmed byte-identical to worktree.

### F07 — Second push does not need a file edit
- **What:** `git commit --allow-empty` fires `pull_request: synchronize`, the
  comment updated (same id), and the workflow stays byte-identical. Editing a
  comment line (the old instruction) would have left the file non-canonical.
- **Fix:** SKILL.md §4 step 3 uses an empty, conventional-format commit
  (commitlint-safe for pilot 2).
- **Class:** skill

### F08 — Merge blocked by reviewer-bot threads
- **Where:** `worktreeflow` main: classic protection with
  `required_conversation_resolution: true`; org ruleset otherwise identical
  to difftree-action's (which has no such rule — why PR #11 merged freely).
- **What:** Copilot (2), CodeRabbit (2) and Greptile (1) opened threads on the
  workflow; Greptile arrived ~7 min after PR open, after the first inventory.
  `gh pr merge` → "the base branch policy prohibits the merge". The skill had
  no notion of review threads. All five answered and resolved with no file
  change (template asks logged as F09–F13).
- **Fix:** SKILL.md §4 new step 4: hand to `pr-merge-flow` where installed,
  else an inline bounded loop (GraphQL unresolved-threads query → REST reply →
  GraphQL `resolveReviewThread` → retry merge, ≤3 rounds / 10 min); never
  edit the workflow to satisfy a bot.
- **Class:** skill

### F09 — Template pins `actions/checkout@v4`; consumer repos use `@v6`
- **Source:** Copilot on PR #22. **Class:** template. Decide in the batched
  template PR before fan-out.

### F10 — Template header says "CI lints it" — false in a consumer repo
- **Source:** Copilot on PR #22. The header is written from difftree-action's
  viewpoint. **Class:** template. Reword for consumers in the batched PR.

### F11 — Fork-PR behaviour undocumented in the template
- **Source:** CodeRabbit and Greptile on PR #22. Verified: `action.yml`
  catches the 403, emits a workflow warning, keeps the tree in the job
  summary/log/`tree` output; `pull_request_target` correctly not used.
  **Class:** template (header note).

### F12 — SHA-pin the action refs
- **Source:** CodeRabbit on PR #22. Declined: floating `@v0` is the documented
  design; the header already explains how to pin. **Class:** template (no change).

### F13 — `persist-credentials: false` on checkout (zizmor)
- **Source:** CodeRabbit on PR #22. **Not a free win:** `action.yml:111-114`
  runs `git fetch origin "$BASE"` at runtime (`|| true`) as a shallow-clone
  safety net; without credentials that fetch fails silently on a private repo.
  Probably harmless with `fetch-depth: 0`, but needs a private-repo test
  before adoption. **Class:** template (test first).

### F14 — Cleanup order: pull before `branch -d`
- **What:** `git branch -d` refused ("not fully merged") because local `main`
  had not yet been fast-forwarded. **Fix:** SKILL.md §4 step 5 orders
  `pull --ff-only` → `worktree remove` → `branch -d`; never `-D`.
- **Class:** skill

### F15 — lefthook runs `actionlint` at commit time in some repos
- **What:** `worktreeflow`'s pre-commit hook linted the workflow; passed.
  **Class:** repo-local, no action.

### F16 — `merge_commit_message: PR_TITLE` double-counts releases
- **Where:** `smorinlabs/difftree-action` repo settings (likely org-wide):
  `merge_commit_title: MERGE_MESSAGE` (correct) but `merge_commit_message:
  PR_TITLE`, so the merge commit *body* carried `feat: fleet rollout prep …`.
- **What:** release-please parsed that body as a `feat` — PR #12 proposes
  v0.4.0 for a docs/fix PR, and the branch's `fix:` commit is counted again.
- **Fix:** Accept v0.4.0 (decision 2026-08-30). Org-wide remedy —
  `merge_commit_message: BLANK` on every release-please repo — is a separate
  settings sweep, not rollout work. Harmless for fan-out PRs (`ci:` does not
  release).
- **Class:** org settings (deferred)

## Pilot 2 — `mockcast`

**Result:** action worked end to end — [PR #11](https://github.com/smorinlabs/mockcast/pull/11),
[run 33293942238](https://github.com/smorinlabs/mockcast/actions/runs/33293942238) (70 s),
comment `5466841088` posted and self-updated on the second push
(`updated_at` 05:07:15Z → 05:08:04Z), commitlint passed on both commits, 2
review threads (CodeRabbit, Greptile) replied to and resolved, merged
`40e01fa`. **Verdict: not clean** — 5 skill edits needed (F17–F21).
Consecutive-clean counter: 0 of 3.

### F17 — Empty-commit command cannot carry a required trailer
- **Where:** SKILL.md §4 step 3: `git commit --allow-empty -m "ci: trigger
  difftree re-run"`
- **What:** The header alone passes commitlint, but every commit in this
  fleet must end with a `Claude-Session: <url>` trailer, and appending it to a
  single `-m` string produces a one-paragraph message that fails commitlint's
  `footer-leading-blank` rule.
- **Fix:** SKILL.md §4 step 3 now says: if your repo requires a commit
  trailer, write the message with `git commit --allow-empty -F <file>` and
  leave a blank line before the trailer.
- **Class:** skill

### F18 — Step 3 gives no way to wait for the *new* run specifically
- **Where:** SKILL.md §4 step 1's poll query, reused unpinned by step 3.
- **What:** After the second push, the unpinned runs-API query is satisfied
  the instant the push lands, because the first run is already
  `completed/success`. A literal follower could re-query the comment before
  the second run posted anything and read the unchanged `updated_at` as a
  false pass.
- **Fix:** SKILL.md §4 step 3 now pins the query with `&head_sha=<new-sha>`
  before re-running the step-2 query.
- **Class:** skill

### F19 — "Same id" is not sufficient evidence the comment self-updated
- **Where:** SKILL.md §4 steps 2–3.
- **What:** The comment id is stable by construction; it comes back unchanged
  whether or not the action rewrote the comment. The only observable proof of
  an update is `updated_at` moving, which the skill never told the agent to
  capture.
- **Fix:** SKILL.md §4 step 2 now records `id` **and** `updated_at`; step 3
  requires the re-check to show the **same id** with a **later `updated_at`**.
- **Class:** skill

### F20 — The thread loop can terminate before the bots have arrived
- **Where:** SKILL.md §4 step 4.
- **What:** The loop stated only a maximum (3 rounds / 10 minutes), no
  minimum. An early empty unresolved-threads query legitimately reads as "no
  threads → done," missing bots that post later (CodeRabbit at +4:20,
  Greptile at +6:57 in this pilot).
- **Fix:** SKILL.md §4 step 4 now states an empty result is not a terminal
  state and gates merge-ready on an empty query until at least ~10 minutes
  after the PR opened.
- **Class:** skill

### F21 — Section 2 says `cd` into the target repo; section 4 assumes a worktree
- **Where:** SKILL.md §2 step 1 vs. §4 step 5.
- **What:** Section 2 said to `cd` into the user's checkout and work there;
  section 4's cleanup already presumed a worktree existed. Committing in the
  user's live checkout is exactly what the fleet's worktree discipline
  forbids.
- **Fix:** SKILL.md §2 step 1 now creates a worktree from the up-to-date
  default branch (`git -C <repo> fetch origin && git -C <repo> worktree add
  ../<repo>-difftree -b ci/difftree-pr-diff-tree origin/<default-branch>`)
  and works there; §3 and §4 step 5 reference that worktree, and step 5's
  cleanup is no longer conditional on "if you made one."
- **Class:** skill

### F22 — Check-run names do not match workflow names
- **Where:** SKILL.md §4 step 1.
- **What:** `PR Diff Tree` is correct for the runs API (what the skill's
  command queries), but the same check appears as the *job* name `diff-tree`
  in `/commits/<sha>/check-runs` and `gh pr checks`; `mockcast`'s `CI`
  workflow appears there as `check`. Anyone cross-checking with a different
  endpoint looks for the wrong string.
- **Fix:** SKILL.md §4 step 1 now adds a clarifying clause distinguishing the
  workflow name from the job name.
- **Class:** repo-local

### F23 — Single-comment endpoint shape (environment note)
- **Where:** re-reading `mockcast` comment `5466841088` by id.
- **What:** `repos/<owner>/<repo>/issues/<pr>/comments/<id>` returns
  `404 Not Found`; the correct path is
  `repos/<owner>/<repo>/issues/comments/<id>`. Not a defect in anything the
  skill instructs — the skill's re-check re-runs the list query, not a by-id
  fetch — so this is logged as a note, not a skill edit.
- **Fix:** none required; would only become a skill edit if a future revision
  rewrote the `updated_at` re-check as a by-id fetch.
- **Class:** docs

### F24 — Template: `@v0` is a mutable tag (CodeRabbit, CWE-494) — recurs
- **Source:** CodeRabbit on PR #11, thread `PRRT_kwDOS0C2fM6de4Ho`. Same ask
  as **F12** (pilot 1, declined there as "floating `@v0` is the documented
  design"). Second pilot in a row to draw this exact comment.
- **Disposition:** not applied to `mockcast` (byte-identity is load-bearing);
  tracked upstream in difftree-action. Recurs; add a one-line justification
  for the floating tag to the template in the T45 batch.
- **Class:** template

### F25 — Template + skill: fork PRs silently get no comment (Greptile, P1)
- **Source:** Greptile on PR #11, thread `PRRT_kwDOS0C2fM6de42t`. `pull_request`
  gives fork PRs a read-only `GITHUB_TOKEN` regardless of `pull-requests:
  write`; the action degrades the resulting 403 to a warning, so the job goes
  green with no comment.
- **Disposition:** template change not applied to `mockcast` (byte-identity;
  no fork PRs today); tracked upstream in difftree-action for the T45 batch.
  The skill half is applied now.
- **Fix:** SKILL.md §4 step 2 adds one sentence: on a fork PR the run can
  still show green with no comment at all.
- **Class:** template + skill

## Pilot 3 — `envgen`

**Result:** action worked end to end — [PR #18](https://github.com/smorinlabs/envgen/pull/18),
[run 33295275688](https://github.com/smorinlabs/envgen/actions/runs/33295275688) (81 s),
comment `5466978275` posted and self-updated on the second push
(`updated_at` 05:43:31Z → 05:44:34Z), 4/4 required checks green, PR open →
all green in 69 s, no runner contention, 12 review threads from 4 bots
(Copilot, CodeRabbit, Greptile, Codex) replied to and resolved, merged as
`c7a1191`. **Verdict: not clean** — 4 skill edits (F26, F27, F28, F29) plus
one more (F30, from self-review). Consecutive-clean counter: 0 of 3.

### F26 — §2 step 1 never warns that the new worktree inherits the repo's git hooks
- **Where:** SKILL.md §2 step 1.
- **What:** A git worktree shares the main checkout's `.git/hooks`, so
  envgen's lefthook `pre-commit` fired in the new worktree and failed
  instantly: its tool binaries (`.bin/yamlfmt`, etc.) live in an untracked
  directory that exists only in the live checkout. `git commit` exited 1
  with nothing committed; the same applies to `pre-push`. The worktree
  instruction is itself a pilot-2 correction, so this is a failure mode the
  skill introduced and did not yet cover.
- **Fix:** SKILL.md §2 step 1 now warns that a worktree inherits repo hooks,
  notes this is exactly the kind of change local hooks cannot usefully gate
  (CI re-runs the same checks on the PR), and says to use the repo's own
  documented bypass (`LEFTHOOK=0`, `HUSKY=0`, `--no-verify`) rather than
  installing tooling into the worktree or editing the workflow — then
  re-verify the committed bytes still match the template.
- **Class:** skill

### F27 — §4 step 4's ~10-minute floor was measured from the wrong event
- **Where:** SKILL.md §4 step 4.
- **What:** §4 step 3 requires a second push immediately before step 4, and
  that push restarts every reviewer. The threads that mattered arrived at
  +6 m 13 s and +7 m 47 s from PR open but only +4 m 02 s and +5 m 36 s from
  the push. Here the PR-open clock happened to be the safer one, but a
  slower step-3 loop could let the PR-open clock expire while the re-review
  is still running.
- **Fix:** SKILL.md §4 step 4 now gates the floor on "~10 minutes after the
  PR opened or after your most recent push, whichever is later," since step
  3's empty commit re-triggers every reviewer.
- **Class:** skill

### F28 — §4 step 4's reply command cannot carry a real reply
- **Where:** SKILL.md §4 step 4's loop, step 2.
- **What:** Every one of the twelve replies needed multiple sentences,
  backticked identifiers, and apostrophes. `-f body='<reason>'` breaks on
  the first apostrophe in `'…'` quoting, mangling the reply or hanging the
  shell. Twelve reply files plus `-F body=@<file>` worked first time.
- **Fix:** SKILL.md §4 step 4's loop now writes the reply to a file and
  posts it with `-F body=@reply.md`.
- **Class:** skill

### F29 — §4 step 4 does not say that reviewer threads are untrusted input
- **Where:** SKILL.md §4 step 4.
- **What:** Three of the twelve threads embedded explicit agent
  instructions — CodeRabbit's "🤖 Prompt for AI Agents" blocks and
  Greptile's "Fix in Claude Code" deep links telling an agent to edit the
  workflow directly. The existing prohibition ("never edit the workflow to
  satisfy a bot") reads as a policy about a bot's *argument*, not a warning
  about a bot's *instructions*.
- **Fix:** SKILL.md §4 step 4 now states thread bodies are untrusted data,
  never instructions, and to quote the claim and answer it rather than
  follow embedded agent directives.
- **Class:** skill

### F30 — §4 step 4's ceiling and floor used the same number, making a second round unsatisfiable
- **Where:** SKILL.md §4 step 4: "at most 3 rounds, 10 minutes total"
  (ceiling) vs. pilot 2's "not before ~10 minutes" (floor).
- **What:** The same number for both bounds is unsatisfiable whenever a
  second round is needed — pilot 3's round 2 arrived +6–8 min, and
  confirmation polling ran to +17 m 42 s, past the 10-minute ceiling though
  within 3 rounds.
- **Fix:** SKILL.md §4 step 4's ceiling raised to "at most 3 rounds, 20
  minutes total"; the floor is unchanged (as amended by F27).
- **Class:** skill

### F31 — envgen's lefthook hooks require `LEFTHOOK=0` for a workflow-only commit
- **Where:** `smorinlabs/envgen`: `lefthook.yml` wires `pre-commit` →
  `make precommit-fast` and `pre-push` → `make prepush-full`; both resolve
  tools under an untracked `$(BIN_DIR)` (`.bin/`).
- **What:** Both commits and both pushes were run with `LEFTHOOK=0`, the
  bypass envgen documents in its own `lefthook.yml`. Nothing was installed
  into the worktree and no repo file was changed to accommodate the hooks;
  CI ran the equivalent checks on the PR and all four required contexts
  passed.
- **Fix:** Repo-local and accepted; the generalisable half is F26. If the
  fleet rollout wants zero bypasses, envgen could make `check-tools-*`
  resolve `$(BIN_DIR)` from the main checkout — an envgen change, out of
  scope for this pilot.
- **Class:** repo-local

### F32 — envgen runs a fourth reviewer bot the skill did not name
- **Where:** SKILL.md §4 step 4: "Repos with reviewer bots (Copilot,
  CodeRabbit, Greptile, …)".
- **What:** `chatgpt-codex-connector[bot]` (Codex code review, enabled
  repo-wide) opened 5 of the 12 threads — the largest single contribution,
  including the two most substantive findings (F34, F35 below). It also
  posts a separate always-on summary *issue* comment at +9 s, which is not
  a review thread and needs no reply.
- **Fix:** SKILL.md §4 step 4's parenthetical extended to "(Copilot,
  CodeRabbit, Greptile, Codex, …)", with a note that Codex's standing
  summary issue comment at PR open is not a thread.
- **Class:** skill

### F33 — Template: recurrence of SHA-pinning, fork-PR behaviour, `checkout` version asks
- **Source:** Threads 1, 3, 4, 6, 9, 10, 11, 12 on PR #18 — eight of twelve.
  Same asks as F12 (pilot 1) and F24 (pilot 2); this is the third
  consecutive pilot to hit them, now with every reviewer independently
  raising the fork-PR issue and Greptile executing the action's comment path
  against a 403 to prove it.
- **Disposition:** Declined per the brief; tracked upstream in
  difftree-action. Would have been pre-empted by the T45 batch (a header
  comment explaining fork-PR behaviour and the `@v0` pinning trade-off) —
  pilot 3 raises that batch's priority from "cosmetic" to "would have
  pre-empted 8 of 12 threads."
- **Class:** template

### F34 — Template: workflow does not re-render on a base-branch change
- **Source:** Thread 8 (Codex, P2) on PR #18. With no explicit `types:`, the
  workflow runs on `opened`, `reopened`, `synchronize`; GitHub reports a PR
  base-branch retarget as `edited`, and `difftree --pr` computes against
  that base, so retargeting without pushing leaves a stale tree in the
  comment with no failed run or warning.
- **Disposition:** Correctness bug in the template; first pilot to surface
  it. Logged, not applied to envgen (byte-identity). Evaluate adding
  `types: [opened, reopened, synchronize, edited]` to
  `examples/pr-diff-tree.yml`, ideally gated on `github.event.changes.base`
  so a title/body edit doesn't trigger a pointless re-render. Needs a
  decision upstream in difftree-action.
- **Class:** template

### F35 — Template: hard-coded `runs-on` can conflict with a repo's runner policy
- **Source:** Thread 7 (Codex, P2) on PR #18. envgen's ADR-0019 states every
  CI job runs on `blacksmith-4vcpu-ubuntu-2404`; the template's `runs-on:
  ubuntu-latest` silently adds a second exception on every PR.
  Byte-identity and a repo-level runner policy are in direct conflict, and
  neither the template nor `action.yml` exposes a runner input.
- **Disposition:** Declined here, escalated upstream. In practice the cost
  was small (the job ran concurrently on a separate pool and did not extend
  the required-check critical path), but the ADR conflict is real and will
  recur on any smorinlabs repo standardised on non-GitHub-hosted runners.
  Decide upstream between (a) documenting `ubuntu-latest` as a deliberate
  fleet-wide choice repo runner ADRs should carve out, or (b) a documented,
  drift-detector-aware single-line override.
- **Class:** template

### F36 — envgen owes a follow-up ADR for the PR-comment CI dependency
- **Where:** `smorinlabs/envgen`, reply
  [3888600762](https://github.com/smorinlabs/envgen/pull/18#discussion_r3888600762)
  on PR #18.
- **What:** Thread 5 (Codex, P1) asked for an ADR covering the new
  PR-comment CI strategy. The pilot's reply told Codex this is "recorded as
  a follow-up for this repo" rather than declined — a public commitment
  that currently exists only in that thread and in the pilot-3 report.
- **Fix:** Open follow-up, tracked here so the promise is kept: envgen needs
  an ADR covering the PR-comment CI dependency's rationale, the
  `pull-requests: write` permission model, and fork-PR behaviour and
  alternatives. No owner assigned yet.
- **Class:** repo-local

## Template batch (T45)

Batched `examples/pr-diff-tree.yml` edit (P03-T45) closing every open
template finding in one PR, so the fleet only re-syncs once.

- Fork-PR note under `on:` closes **F11/F25**.
- `edited` event + base-change `if:` closes **F34**.
- Floating-tag rationale and SHA-pin syntax on the `@v0` comment closes
  **F12/F24/F33**.
- `runs-on: ubuntu-latest` carve-out note closes **F35**.
- `actions/checkout@v6` bump closes **F09**.
- `persist-credentials: false` on the checkout step closes **F13**.
- Header reworded to a consumer-facing sentence closes **F10**.
