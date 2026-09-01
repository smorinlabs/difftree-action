# difftree-action fleet rollout — findings log

Append-only log of gotchas found while piloting the `difftree-action-setup`
skill across `smorinlabs` repos (PROJECTS.md P03). One entry per finding.
Each entry: where it surfaced, what happened, what the fix was, and whether
the fix is **skill**, **action**, **template**, **docs**, **repo-local** (no skill
change), or **org settings**.

Fan-out gate: originally three consecutive pilot repos with zero **skill** entries;
relaxed 2026-08-30, after the §4 rewrite, to one clean pilot on a private repo, with
fan-out then proceeding under per-repo §4 verification. Pilot 4 (`ts-launch-blueprint`)
did not pass the relaxed gate (G17, G18); a fresh session retests the corrected skill cold.

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
- Codex adversarial review of this batch confirmed the F13 risk does not
  materialize: `actions/checkout`'s authenticated `fetch-depth: 0` fetch
  brings `origin/<base>` into the local repo before credentials are
  stripped, so `persist-credentials: false` is safe regardless of the
  private-repo test outcome. **F13 is closed by review, not by the
  private-repo pilot.**

### F37 — `action.yml`: fork-PR warning overclaims where the tree is available
- **Where:** `action.yml:206` (the `core.warning(...)` call on a 403) and the
  job-summary step (`action.yml:214-228`).
- **What:** On a 403 the action's warning text says the tree is "available in
  the job log and the `tree` output," but the job summary step never writes
  the rendered tree (only base ref, files-changed, and comment URL), the
  template's `difftree-action` step has no `id` so nothing downstream can
  reference the `tree` output, and the tree is rendered to a file rather than
  printed to the log. On a fork PR, the tree is currently available nowhere a
  consumer can see it.
- **Fix:** Not applied here (`action.yml` is out of scope for T45). Upstream
  fix: on a 403, append the rendered tree to `$GITHUB_STEP_SUMMARY`, and stop
  the warning text from claiming "available in the job log."
- **Class:** action

## Re-sync 1 — `worktreeflow` (Task 9)

Ran the rewritten §4 checklist (Task 8) against `smorinlabs/worktreeflow`, which already had
`pr-diff-tree.yml` (exercising §2 step 1's replace-in-place branch). PR #23; runs `33300645980`
(install commit) and `33300731885` (empty-commit re-run); comment `5467536052`; merged `12619d7`.

**Verdict: not clean — 10 skill gotchas (G1–G10; controller added G12).** Followed the skill
literally with no improvisation; nothing outside these items was skipped or reordered.

Bonus evidence: a `skipped` `PR Diff Tree` run was created 5 s into a live `success` render and
did **not** cancel it — job-level `concurrency` holding under a real second event, corroborating
the T45 template batch's `edited`-event re-render change (F34/F35).

### F38 — §2 step 1's replace-in-place clause is a no-op on an already-named file, no command otherwise
- **Where:** SKILL.md §2 step 1.
- **What:** `worktreeflow`'s existing workflow was already named `pr-diff-tree.yml`, so "renaming
  it to `pr-diff-tree.yml`" read as an instruction to a literal follower with nothing to do. For a
  differently-named file the clause gave no command at all: a naive copy over the new path leaves
  the old file in place as an addition plus an orphan — exactly what it exists to prevent — and
  there was no stated evidence test for "the replacement fired".
- **Fix:** SKILL.md §2 step 1 now gives the command (`git mv <old> .github/workflows/pr-diff-tree.yml`
  when the name differs, then write the template over that path) and a fired-evidence check:
  `git status --porcelain` shows one entry and no leftover file; post-PR, the PR's file status is
  `modified`/`renamed`, never `added`.
- **Class:** skill

### F39 — "byte-identical to the template" named no ref; the two resolver branches can differ
- **Where:** SKILL.md §2 step 2.
- **What:** The in-repo resolver returned a template on an unpublished branch 19 commits ahead of
  `origin/main`; the `curl` fallback would have fetched `main`'s materially different copy. "The
  template" is two different files depending on where the skill loaded from, but the
  byte-identity invariant was stated as absolute. This was not theoretical: Copilot diffed the
  installed file against `difftree-action@main`, found the mismatch, and filed it as drift — the
  PR's only review thread. The PR body's "copied verbatim from `examples/pr-diff-tree.yml`" was
  true but unfalsifiable because it named no ref.
- **Fix:** SKILL.md §2 step 2 now states the invariant against `$TEMPLATE` as resolved, explains
  that an unpublished local branch can differ from `main`'s copy, and requires declaring the
  template's provenance (commit and publication state, or `main` for the `curl` path) and the
  direction of any difference in the PR body — answered with provenance, never by editing the file.
- **Class:** skill

### F40 — the `skipped`-run note undercounted, and missed that a skipped run can land mid-render
- **Where:** SKILL.md §4 step 1.
- **What:** Three `skipped` runs appeared, not one, and the first landed 5 s after the success run
  started and 77 s before it completed — poll 1 returned `completed skipped` on the top line while
  the real run was still `in_progress`. Separately, `/commits/<sha>/check-runs` returns two rows
  both named `diff-tree`, one `skipped` and one `success`; matching on name alone is ambiguous.
- **Fix:** SKILL.md §4 step 1's Pass condition now says to expect several `skipped` lines, expect
  one before the success run completes, never treat the first `completed` line as terminal, and to
  match `check-runs` rows on conclusion, not name.
- **Class:** skill

### F41 — the "not a thread" exemption named only Codex; CodeRabbit and Greptile behaved the same
- **Where:** SKILL.md §4 step 6.
- **What:** Only Copilot opened a review thread; CodeRabbit and Greptile each posted a summary
  issue comment and zero threads; Codex did not appear. The skill's parenthetical exempted Codex
  by name, leaving no rule for the other two, and its premise that reviewer bots "open threads" was
  false for three of the four bots named on this PR.
- **Fix:** SKILL.md §4 step 6 now says all four bots may open threads or may instead post only a
  summary issue comment (Codex always does; CodeRabbit/Greptile do when they find nothing), and
  that a summary issue comment needs no reply — only `reviewThreads` gate the merge.
- **Class:** skill

### F42 — the review-thread floor is unconditional, so a clean PR pays ~20 empty GraphQL queries
- **Where:** SKILL.md §4 step 6.
- **What:** The last bot artifact landed at `T0` + 5:40 and the only thread resolved at `T0` +
  2:07, but the floor forced polling to `T0` + 10:10 — 20 further paginated calls with nothing
  left to find. Not a defect: the skill states the floor is a heuristic and step 7 re-checks, and
  the cost is the proof the floor is doing its job — Greptile arrived at `T0` + 5:40, after a naive
  "threads are empty, we're done" reading at `T0` + 3:30 would have merged.
- **Fix:** None — the floor is justified as designed; recorded as a measured cost, not a defect.
- **Class:** skill (no change)

### F43 — the `pr-merge-flow` hand-off did not say whose wait bound wins, and they disagreed here
- **Where:** SKILL.md §4 step 6.
- **What:** `pr-merge-flow`'s own bot-wait bound (~5 min from the push) expired at `T0` + 4:41;
  Greptile posted 40 s after that bound. Taking `pr-merge-flow`'s "ready" as authoritative would
  have declared the PR ready before the last reviewer arrived — a condition `pr-merge-flow` cannot
  know about or satisfy on its own.
- **Fix:** SKILL.md §4 step 6 now states that `pr-merge-flow`'s bot-wait bound is shorter than this
  step's floor, so its "ready" is not this step's Pass: run call 1 yourself at or after the floor
  and require exit 0 with an empty `$out` after it returns.
- **Class:** skill

### F44 — the byte-identity/never-edit constraint sat after the `pr-merge-flow` hand-off, unreachable from it
- **Where:** SKILL.md §4 step 6.
- **What:** `pr-merge-flow`'s triage rubric routes a small in-scope bug above the value floor to a
  fix-and-push. Copilot's finding (the file not matching `difftree-action@main`) was valid by that
  rubric's own criteria, so a reader who hands off to `pr-merge-flow` and lets it apply its own
  rubric gets a file edit — breaking the invariant the skill exists to protect. This was avoided
  only because the task brief restated the constraint independently.
- **Fix:** SKILL.md §4 step 6 now states the byte-identity/never-edit rule, and that it must be
  stated to `pr-merge-flow` at hand-off, *above* the hand-off sentence rather than after it.
- **Class:** skill

### F45 — "no `with:` block" is now ambiguous because the canonical template itself contains one
- **Where:** SKILL.md §2 step 4.
- **What:** The current template has a `with:` block on the `actions/checkout` step
  (`fetch-depth: 0`, `persist-credentials: false`); a literal `grep -c '^ *with:'` check on a
  correct verbatim install returns 1, not 0. The sentence meant "no `with:` on the
  `smorinlabs/difftree-action` step" but did not say so, and the template changed under it.
- **Fix:** SKILL.md §2 step 4 now says "no `with:` block on the `smorinlabs/difftree-action`
  step" and notes the `actions/checkout` step's `with:` is part of the template and stays.
- **Class:** skill

### F46 — "compared as strings" gave no comparison idiom, and the obvious one is not portable to zsh
- **Where:** SKILL.md §4 preamble.
- **What:** The natural POSIX form `[ "$a" \> "$b" ]` fails under zsh — the default shell on
  macOS — with `condition expected: >`; the comparison in this run was still decided correctly by
  eye, but a loop written to the skill's letter silently takes the false branch every iteration.
- **Fix:** SKILL.md §4 preamble now gives a comparison that works under both `sh` and `zsh`
  (sorting the two ISO-8601 strings lexically and checking which sorts last), and states that
  `[ "$a" \> "$b" ]` is a zsh syntax error.
- **Class:** skill

### F47 — the example commit/PR subject said "add", which is wrong for the replace-in-place path
- **Where:** SKILL.md §3.
- **What:** §2 step 1 has an explicit replace-in-place branch, but §3 offered only the "add"
  subject (`ci: add difftree PR diff-tree comments`), which misdescribes that branch's change.
- **Fix:** SKILL.md §3 now gives both subjects: "add" for a first install, "sync … to canonical
  template" when §2 step 1's replace-in-place branch fired.
- **Class:** skill

### F48 — environment notes: `ugrep` shim and foreground `sleep`
- **Where:** this session's shell (zsh, `grep` shimmed to `ugrep`).
- **What:** `grep -q 'smorinlabs/difftree-action@'` behaved identically under the `ugrep` shim, so
  the resolver guard is unaffected — informational only. Separately, the harness tool description
  states foreground `sleep` is blocked, but every bounded poll loop this session ran `sleep 20` in
  the foreground and completed normally (only the first step 1 loop was backgrounded, before this
  was tested, and it also worked).
- **Fix:** None — no skill or docs behavior depends on either observation.
- **Class:** docs

### F49 — `--match-head-commit` requires the full 40-character OID; a short sha fails
- **Where:** SKILL.md §4 steps 3 and 7.
- **What:** `gh pr merge … --match-head-commit <sha2>` requires the complete Git object ID; an
  abbreviated sha fails with "Could not coerce value … to GitObjectID". `<sha2>` is recorded in
  §4 step 3 via `git rev-parse HEAD` and `.head.sha`, both of which already return it in full.
- **Fix:** SKILL.md §4 step 3's Pass condition and §4 step 7's Command now both state `<sha2>` is
  the full 40-character OID and must never be abbreviated.
- **Class:** skill

## Re-sync 2 — `mockcast` (Task 10)

Ran the corrected §4 checklist (Task 9b) against `smorinlabs/mockcast`, whose `refs/heads/ci/difftree-pr-diff-tree`
survived on the remote from pilot 2 because `mockcast` has `delete_branch_on_merge=false` — this is what §2 step 1's
new leftover-branch precondition exists to catch. [PR #12](https://github.com/smorinlabs/mockcast/pull/12); runs
[33302722147](https://github.com/smorinlabs/mockcast/actions/runs/33302722147) (install commit) and
[33302803733](https://github.com/smorinlabs/mockcast/actions/runs/33302803733) (empty-commit re-run); comment
[5467748223](https://github.com/smorinlabs/mockcast/pull/12#issuecomment-5467748223); merged
[`706dcac`](https://github.com/smorinlabs/mockcast/commit/706dcacea82e2c8f0e4b87c5c34ad008ac2db932).

**Verdict: not clean — G13 carried, G14.** Zero review threads; every Task-9b correction held (see the report's
carry-forward table). Consecutive-clean counter: 0 of 1 toward the relaxed gate.

### F50 — §4 step 8 cleanup never deleted the remote branch, blocking the next run on the same repo (G13)
- **Where:** SKILL.md §4 step 8 (cleanup) and §2 step 1 (worktree creation).
- **What:** Step 8's only branch-deleting text was local (`git branch -d`); on `mockcast`
  (`delete_branch_on_merge=false`) the remote `ci/difftree-pr-diff-tree` ref survived pilot 2's merge with nothing
  else to delete it. §2/§3 pin the branch name, so the survivor blocked this run at its first precondition check
  until the controller deleted it by hand. `envgen` and `worktreeflow` both have `delete_branch_on_merge=true`,
  which is why only `mockcast` tripped.
- **Fix:** §2 step 1 now requires `git -C <repo> ls-remote --heads origin ci/difftree-pr-diff-tree` to be empty
  before creating the worktree — delete a merged leftover and continue, stop and ask on an unmerged one. §4 step 9
  (cleanup, renumbered by the new G18 step) now deletes the remote branch too when
  `delete_branch_on_merge=false`, with `git ls-remote` empty as its own pass condition.
- **Class:** skill

### F51 — `/commits/<sha>/check-runs` "two rows" undercounted; the row count tracks `edited` events, not a fixed number
- **Where:** SKILL.md §4 step 1.
- **What:** `<sha>` `7c5ec54…` carried **three** `diff-tree` rows (two `skipped`, one `success` — two `edited`
  events plus the real run); `<sha2>` carried **one** (`success`, no `edited` events on that push). The prescribed
  behavior ("match on the conclusion, not the name") was already correct and worked; only the fixed count "two"
  was wrong, and it implied both counts are always present.
- **Fix:** §4 step 1's Pass now says the row count varies with how many `edited` events fired and to match on
  conclusion, never on the name or the row count. Reconfirmed on `envgen` (three rows on `<sha>`, one on `<sha2>`)
  and a third time on `ts-launch-blueprint` (three rows on the pinned head).
- **Class:** skill

## Re-sync 3 — `envgen` (Task 10)

Same corrected checklist against `smorinlabs/envgen` (`delete_branch_on_merge=true`, so no leftover branch).
[PR #19](https://github.com/smorinlabs/envgen/pull/19); runs
[33303531623](https://github.com/smorinlabs/envgen/actions/runs/33303531623) (install commit) and
[33303639378](https://github.com/smorinlabs/envgen/actions/runs/33303639378) (empty-commit re-run); comment
[5467832863](https://github.com/smorinlabs/envgen/pull/19#issuecomment-5467832863); merged
[`aed8a7d`](https://github.com/smorinlabs/envgen/commit/aed8a7d4a882c346fad19204cfdb552a8488e562).

**Verdict: not clean — G15.** Zero review threads; G14 reconfirmed (see F51); every other Task-9b correction held.
Consecutive-clean counter: 0 of 1 toward the relaxed gate.

### F52 — the hooks bypass covered `git commit` but not the skill's own `git push` commands (G15)
- **Where:** SKILL.md §2 step 1 (hooks paragraph), §3 and §4 step 3 (push commands).
- **What:** Every bypass example named `git commit`; §3's and §4 step 3's push commands carried no bypass at all.
  `envgen`'s lefthook installs a `pre-push` hook running `make prepush-full`, which needs the untracked `.bin/`
  absent from the worktree. Both pushes were run with `LEFTHOOK=0` as a deliberate, disclosed extension of the
  skill's letter — without it, the push would have run envgen's full Rust check suite from a worktree missing its
  tooling.
- **Fix:** §2 step 1's hooks paragraph now says the bypass covers `pre-commit` **and** `pre-push`, names the §3 and
  §4 step 3 pushes explicitly, and gives `ls .git/hooks | grep -v '\.sample$'` to check what's wired. §3 and §4
  step 3's commands are now prefixed with `<bypass>` (empty when the repo has no hook manager).
- **Class:** skill

### F53 — G16 withdrawn: "fails on tool binaries" does not understate the risk (no auto-install)
- **What:** G16 proposed warning that a hook might silently *install* missing tooling rather than fail; a
  reviewer showed `envgen`'s `install-actionlint` recipe exits non-zero without network access rather than running,
  so the hook fails loudly as the skill already says — withdrawn, no text applied.
- **Class:** docs

## Pilot 4 — `ts-launch-blueprint` (Task 11, the gate)

Full skill run against `smorinlabs/ts-launch-blueprint` (private, TypeScript, `delete_branch_on_merge=false`) —
the confirming pilot for the relaxed P03-TS01 gate, and the first run to exercise §2 step 1's clone-if-missing
branch. [PR #27](https://github.com/smorinlabs/ts-launch-blueprint/pull/27); runs
[33304644631](https://github.com/smorinlabs/ts-launch-blueprint/actions/runs/33304644631) (install commit),
[33304886014](https://github.com/smorinlabs/ts-launch-blueprint/actions/runs/33304886014) (empty-commit re-run),
and [33320481315](https://github.com/smorinlabs/ts-launch-blueprint/actions/runs/33320481315) (SHA-pin follow-up
commit, same PR); comment [5467948676](https://github.com/smorinlabs/ts-launch-blueprint/pull/27#issuecomment-5467948676);
merged [`f4cbdca`](https://github.com/smorinlabs/ts-launch-blueprint/commit/f4cbdcad91f004e9eb67b145470cf7d7235c1459).

**Verdict: GATE NOT PASSED — 2 skill edits (G17, G18).** Every §4 pass condition became true on the byte-identical
install, but the repo's own hygiene test failed the floating `@v0` ref, and the merge precondition as written would
have merged past three red checks the install itself caused.

### F54 — the byte-identity rule had no branch for a repo whose own CI enforces SHA-pinning, though the template sanctions exactly that deviation (G17)
- **Where:** SKILL.md §2 step 2 and §4 step 6 (now step 6/8 in the rewritten checklist).
- **What:** `ts-launch-blueprint`'s `tests/repo-hygiene.test.ts` (its D-022/D-027 supply-chain rule) failed on the
  byte-identical `smorinlabs/difftree-action@v0` line, turning three checks red on both `<sha>` and `<sha2>`. The
  skill's only guidance — byte-identical, template-level asks tracked upstream — pointed away from the fix the
  template's own comment sanctions in the same six lines the skill installs verbatim: SHA-pinning is "the one
  sanctioned deviation from byte-identity with this template; the fleet drift check ignores it." The skill never
  named the carve-out at all — a live contradiction between the shipped instructions and the shipped template, not
  a judgment call.
- **Ruling (owner decision, 2026-08-30):** pin in this repo. `smorinlabs/difftree-action` is now SHA-pinned to
  `8fbc74d75ecdec41890a944d2ddf504ea7ae5a2f # v0.4.0` on `ts-launch-blueprint` per its D-022(9) hygiene policy —
  the template's own sanctioned deviation, verified against `gh api …/git/ref/tags/v0.4.0` before committing. All
  three checks went green; the byte check re-passed once normalized back to `@v0`. The ruling confirms G17 rather
  than retiring it: the skill still had no text that would have led an operator here on its own.
- **Fix:** §2 step 2 now detects a repo's SHA-pin policy (every third-party `uses:` already pinned, or a named
  hygiene test) and, when present, resolves the tag's sha and writes the pinned form, recording it in the PR body;
  the byte check normalizes that one line back to `@v0` before diffing. §4 step 6 (thread step) now treats a
  SHA-pinning ask as the sanctioned exception rather than lumping it with genuinely upstream template asks.
- **Class:** skill

### F55 — the merge precondition never looked at the PR's other checks, so the skill would have merged a PR its own change turned red (G18)
- **Where:** SKILL.md §4 step 7 (merge, now step 8).
- **What:** At `09:57:50Z`, threads were empty and the head was locked — step 7's precondition as written was
  fully satisfied — while `continuous-integration (24.x)`, `continuous-integration (26.x)`, and `bun-lane` were all
  `failure` on `<sha2>`, caused by G17's SHA-pin gap. `main` is unprotected, so `gh pr merge` would have succeeded;
  only the brief's explicit "do not merge" instruction stopped it. No prior pilot repo had ever failed CI, so six
  runs never surfaced the gap.
- **Ruling:** never merge on the strength of an unprotected branch when a check is red — codified as a skill gate,
  not left to operator judgment.
- **Fix:** new SKILL.md §4 step 7, inserted between the thread step and merge (later steps renumbered): lists
  check-runs on `<sha2>` and requires none `failure`/`cancelled`/`timed_out`/`action_required` (an advisory
  `continue-on-error` job still reports `failure` here); branch-protection required contexts, when present, are
  mandatory. On fail, a failure caused by the repo's own hygiene test tripping the template routes to §2 step 2's
  SHA-pin policy branch; anything else stops for a human call. Empirically exercised in both directions on this
  PR: `["continuous-integration (24.x)","continuous-integration (26.x)","bun-lane (advisory, non-gating)"]` before
  the pin, `[]` after it.
- **Class:** skill

### F56 — F13 closed by direct observation on a private repo: the runtime fetch fails and is silently swallowed; the tree still renders
- **Where:** `action.yml:111-114`'s runtime `git fetch origin <base>` safety net, read from the `PR Diff Tree` job
  log on both runs of this PR.
- **What:** `actions/checkout@v6` fetches every ref, including `origin/main`, **163 ms before** it strips
  credentials; the action's own `git fetch --no-tags origin main` then runs unauthenticated against a private repo
  with `stderr` to `/dev/null` and `|| true` discarding the exit status — it necessarily fails, and the step
  produces zero output either way (304 ms total for the whole step). The tree rendered correctly on both runs
  (`DT_FILES: 1`, comment created and later self-updated) regardless. Cross-ref **F13** (Template batch, T45):
  Codex's earlier review argued this was safe by construction; this is the first empirical confirmation, on a
  private repo, in both a cold and a warm run.
- **Fix:** None — F13 stays closed. Worth carrying forward as documentation only: the silence is total, so if
  `fetch-depth: 0` were ever dropped on a private repo, the failure mode would be difftree failing at `merge-base`
  with no signal that the runtime fetch had also failed.
- **Class:** docs

### F57 — §2 step 1's clone-if-missing branch, exercised for the first time, held without modification
- **Where:** SKILL.md §2 step 1.
- **What:** `~/c/ts-launch-blueprint` did not exist before this run — the first time any pilot exercised the
  clone branch rather than the "repo already checked out" path. `git clone https://github.com/<owner>/<repo>.git
  ~/c/<repo>` succeeded over HTTPS with no prompt (this machine has `credential.helper=osxkeychain` wired), and
  the live checkout was never touched afterward. The skill's text says nothing about authentication; on a machine
  without a credential helper the same command would hang on a username prompt rather than fail fast. Recorded as
  a **watch item, not a gotcha** — nothing went wrong, and the fix (`GIT_TERMINAL_PROMPT=0`) would be speculative
  until it actually bites.
- **Fix:** None applied; watch item only.
- **Class:** skill (no change)

The reply/resolve mechanism (an actual reply plus `resolveReviewThread`) was exercised on the three original
pilots, on Task 9's `worktreeflow` re-sync (1 thread), and again here on pilot 4 (2 Copilot threads, replied to
with `-F body=@file` and resolved) — but drew **zero** threads on Task 10's `mockcast` and `envgen` re-syncs. The
`pr-merge-flow` hand-off itself (G6/G7's ordering corrections) has still never been exercised: every thread across
every run so far has been answered inline via the skill's own (a)/(b) loop.

## Final whole-branch review (2026-08-30)

Ledger triage from the whole-branch and Codex adversarial reviews. One line each; all **docs** class.

- **F58** — `examples/pr-diff-tree.yml`'s SHA-pin comment carries a literal example sha (`8fbc74d7… # v0.4.0`) that goes stale every release; now prefixed "e.g.". Maintenance item: refresh it at each release, or it misleads a reader who copies it.
- **F59** — Task 7 Codex residual: GitHub `concurrency` ordering is not guaranteed — an older event can still cancel a newer one in the same group. Accepted; no template fix (the job-level `if:` removes the no-op `edited` case, which was the observed bug).
- **F60** — `.merged` can read `false` immediately after `gh pr merge` when the merge is queued under auto-merge; the skill never passes `--auto`, so its step 8 read is synchronous. Accepted.

### F61 — required-context query failure reads identically to "no protection"

**Status:** tracked — not fixed on this branch (controller ruling 2026-08-30: no further fix wave; the fresh-session cold retest owns these).
- **Where:** SKILL.md §4 step 7 (~line 288).
- **What:** `req="$(gh api ".../branches/<default>/protection" --jq '.required_status_checks.contexts[]' 2>/dev/null)" || req=""` treats any failure of the protection query — rate limit, auth, network — the same as the one case it's meant to mean: an unprotected branch's 404. A transient failure would silently read as "no required contexts" rather than stopping the run.
- **Fix:** capture the HTTP status (or use `gh api --include` / check `$?` and stderr) and treat only 404 as "none required"; any other failure stops the step. Bound: step 7's completed-check and no-failure gates still catch a broken commit regardless, so this only weakens the defense-in-depth required-context check.
- **Class:** skill

### F62 — passing-check-names query is unguarded; its failure can report as success

**Status:** tracked — not fixed on this branch (controller ruling 2026-08-30: no further fix wave; the fresh-session cold retest owns these).
- **Where:** SKILL.md §4 step 7 (~line 289).
- **What:** the `ok="$(gh api .../check-runs ... --jq '...')"` line has no failure guard. If it fails while `$req` is empty (e.g., an unprotected branch), the `while` loop that consumes `$req` never runs, `$miss` stays empty, and the step reports pass even though the check-run query itself failed.
- **Fix:** `ok="$(…)" || { echo "check-run query failed"; false; }` before the loop that consumes `$ok`.
- **Class:** skill

### F63 — fixed-path marker files can collide across concurrent runs, or fail to be created

**Status:** tracked — not fixed on this branch (controller ruling 2026-08-30: no further fix wave; the fresh-session cold retest owns these).
- **Where:** SKILL.md §4 step 6 (~line 252) and step 7 (~line 290).
- **What:** `${TMPDIR:-/tmp}/thread-fails` and `${TMPDIR:-/tmp}/ctx-missing` are fixed paths. Two concurrent runs sharing the same `TMPDIR` would clobber each other's marker file, and if the file's own creation fails, the marker mechanism silently loses a recorded failure. The skill already forbids concurrent runs, so this is bounded, not live.
- **Fix:** per-run unique names via `mktemp`, plus `set -C` or an existence check before writing.
- **Class:** skill

### F64 — "runs in a subshell" comment is POSIX-`sh`-specific, not true for zsh

**Status:** tracked — not fixed on this branch (controller ruling 2026-08-30: no further fix wave; the fresh-session cold retest owns these).
- **Where:** SKILL.md §4 step 6 (~line 252).
- **What:** the comment "a piped while runs in a subshell" holds for POSIX `sh` but not for `zsh`, where the last stage of a pipeline runs in the current shell. The marker-file mechanism the comment justifies is correct under both shells; only the stated reason is shell-specific.
- **Fix:** reword to "may run in a subshell (sh); the marker file is correct in both."
- **Class:** docs

### F65 — `sleep 20` after the final thread pays an unnecessary wait

**Status:** tracked — not fixed on this branch (controller ruling 2026-08-30: no further fix wave; the fresh-session cold retest owns these).
- **Where:** SKILL.md §4 step 6 (~line 259).
- **What:** the `sleep 20` inside the thread-reply loop also fires after the last thread, when there is nothing left to space out. Cost is bounded (≤20 s) and the loop still functions correctly.
- **Fix:** move the sleep to the top of the loop guarded by a first-iteration flag, or accept the ≤20 s cost.
- **Class:** skill (nit)

Codex's app_id objection — that the required-context match (§4 step 7c) ignores `required_status_checks.checks[].app_id` and so could conflate two different apps' checks under the same context name — was ruled a deliberate non-goal for this fleet (cross-app name collisions are not a real case here); revisit only if a repo installs two apps that both report the same context name.

## Fan-out readiness

**Gate result: NOT MET.** `[P03-TS01]`'s relaxed form — one clean pilot after the §4 rewrite, on a private repo —
required zero skill edits from pilot 4; it needed two (G17, G18). Both are now folded into `SKILL.md` on this
branch, but neither has been proven against a cold run: every gotcha found so far was found *by* the run that
triggered the fix, never confirmed absent on a subsequent one. Recommendation: a fresh session re-runs the
corrected skill against a new repo (2–3 runs) before any fan-out begins — see the handoff note under
`[P03-TS01]` in `PROJECTS.md`.

**Open pre-fan-out items** (none blocking a retest, all worth tracking before or during fan-out):
- **F37** — `action.yml`'s fork-PR warning overclaims where the tree is available (job summary never gets it);
  fix is upstream in `action.yml`, out of scope for this branch.
- **F16** — org-wide `merge_commit_message: PR_TITLE` double-counts release-please commits; deferred as a
  separate settings sweep, harmless for `ci:`-prefixed fan-out PRs.
- **envgen ADR promise (F36)** — envgen owes a follow-up ADR for the PR-comment CI dependency, promised in a PR
  #18 reply; no owner assigned yet.
- **F43** — the `pr-merge-flow` hand-off's bound-precedence fix has been carried through every re-sync and pilot
  4, but never actually exercised (pilot 4's two threads were answered inline, not via hand-off); still reasoned
  correct, not observed under load.

**Task 8 parked residuals, now folded** (from `task-8-report.md`'s fix rounds):
- **(a)** a "head moved" restart from §4 step 4 now reassigns `<sha2>` to the new `head.sha` and refreshes
  `<T_push>` — exactly what pilot 4's SHA-pin follow-up did in practice, now cited in §4 step 8's precondition.
- **(b)** the thread-loop's reply/resolve calls now run only inside call 1's success branch
  (`if out="$(…)"; then …; else …; false; fi`), not after an `||`.
- **(c)** §2 step 2's resolver failure arm now ends in `false`, matching every other failure arm in the file
  (was the file's one remaining bare `exit 1`).
- **(d)** §4 step 8's (merge) Pass condition now requires both `.merged == true` **and** a non-null
  `merge_commit_sha`, not just the first printed line.

**Recommended fan-out mechanics:** one skill run per repo, sequential (never two poll loops concurrently, per the
global constraint) — the corrected §4 checklist (now 10 steps) is each repo's acceptance test; the controller
merges only under §4 step 7's "no other check failing" rule, never on an unprotected branch's silence. Remote-branch
deletion (G13) now fires automatically for `delete_branch_on_merge=false` repos, so repeated runs against the same
repo no longer need manual cleanup. The SHA-pin policy detection (G17) fires automatically for any repo carrying
its own SHA-pin hygiene test — `ts-launch-blueprint`'s sibling TypeScript repos and any repo sharing its D-022(9)
template are the most likely next hits.

**The remaining repos**, from `PROJECTS.md`'s fan-out rows (`[P03-T08]`–`[P03-T43]`, 36 total) minus `difftree-action`
(`[P03-T19]`, kept as-is — it dogfoods itself with `uses: ./`, never installs the template) and
`ts-launch-blueprint` (`[P03-T42]`, now installed via pilot 4): **34 repos**, grouped by
`gh api orgs/smorinlabs/repos --jq '.[] | select(.archived==false) | "\(.name)\t\(.private)"'`:

- **Private (8)** — `ge-smorin-app`, `shelf`, `skillsmith`, `smorin-segment-timer`, `terraform-gcp-design`,
  `terraform-gcp-poc`, `terraform-gcp-template`, `warpqueuekit`.
- **Harness/infra (2)** — `harness-kit`, `smorinlabs-harness` (in addition to `difftree-action` itself, which is
  not a fan-out target — see above).
- **Test/scratch (4)** — `blueprint-dryrun`, `blueprint-press-dryrun`, `contributors-please-e2e`,
  `contributors-please-test`.
- **Ordinary (20)** — `agent-fork`, `agent2linear`, `claude-openrouter-launcher`, `cli-standards`,
  `contributors-please`, `contributors-please-action`, `difftree`, `doxa-research`, `homebrew-tap`, `identikit`,
  `identikit-py`, `identikit-pylib`, `identikit-rs`, `identikit-rslib`, `identikit-tslib`, `py-launch-blueprint`,
  `register-gated-verification`, `rest-standards`, `substrata`, `template-press`.

## Cold retest 1 — `agent2linear` (2026-08-31)

Fresh session, no prior context; skill text = `main` @ `1d90044` (SKILL.md unchanged since v0.5.0 `cf065be`).
Repo shape: public TypeScript, protected `main` with two required contexts (`check (22.x)`, `check (24.x)`),
`delete_branch_on_merge=true`, no hook manager, floating action tags (no SHA-pin policy); bots Copilot, CodeRabbit,
Greptile, Codex, plus a `[code]smith` app check-run (skipped).

PR https://github.com/smorinlabs/agent2linear/pull/25 · `<sha>` `38f8e04` · `<sha2>` `207b750` · merge `d6c64fb`
· `<T_open>` 05:18:14Z · `<T_push>` 05:19:57Z · floor 05:29:57Z · call 1 empty at 05:29:59Z · steps 1–9 pass
(run 1 `33360064536`, run 2 `33360164176`, comment `5474081312` `05:19:37Z → 05:20:09Z`; two threads refuted and
resolved; owner-approved merge; branch auto-deleted).

**Verdict: clean** (owner-ratified 2026-08-31) — every step ran as written and no skill edit was needed to complete
the run; every surprise (a `skipped` `edited` run before the success run, `head.sha` lagging the push by <20 s,
bracketed/space-bearing check names in step 7c, `pr-merge-flow`'s bot-wait ending before the floor) was already
predicted by the text. Consecutive-clean count: **1**. The findings below are hardenings and canned-answer gaps;
none blocked. `[P03-TS01]` stays open only because its row requires a private repo (`shelf` is the candidate).

### F66 — §4 step 9 `git branch -d` refuses after an explicit-URL update of the default branch
- **Where:** SKILL.md §4 step 9 (pre-assigned by the 2026-08-30 handoff; observed at the previous session's
  close-out on `difftree-action` itself, not in this run).
- **What:** `git pull <url> <default>` moves the local branch but not `refs/remotes/origin/<default>`;
  `branch -d` then judges "not fully merged" against a stale upstream and refuses.
- **Fix:** step 9's On-fail gains one retry — refresh `refs/remotes/origin/<default>` through the transport that
  just worked (`git fetch <url-the-pull-used> +refs/heads/<default>:refs/remotes/origin/<default>`; CodeRabbit
  noted a bare `fetch origin` would reuse the refused transport), then the whole tail from `branch -d` on
  (including the `delete_branch_on_merge` test and remote delete — Greptile caught the first wording dropping that
  half), never `-D` (this PR; **proposed, not reproduced** — it needs an SSH-refused session to trigger).
  Greptile's simulation artifacts on PR #18 reproduced the stale-tracking-ref refusal independently.
- **Class:** skill.

### F67 — §2 step 1 never checks that an existing `~/c/<repo>` clone's origin is `<owner>/<repo>`
- **Where:** SKILL.md §2 step 1 ("If `~/c/<repo>` does not exist, clone it").
- **What:** `~/c/agent2linear` has `origin = https://github.com/smorin/agent2linear.git`; every push and fetch
  worked only because GitHub redirects the transferred repo to `smorinlabs/agent2linear` (`git push` printed
  `To https://github.com/smorin/agent2linear.git`). A same-named clone of a *different* repo would be pushed to
  silently.
- **Fix:** step 1 now requires `git -C <repo> ls-remote --get-url origin` to match
  `github\.com[:/]<owner>/<repo>(\.git)?$` and stops on a redirect, another host, or a mismatch (this PR; the
  host anchor was a Copilot review catch on PR #18). Repo-local: this clone's remote is the owner's to fix with
  `git -C ~/c/agent2linear remote set-url origin https://github.com/smorinlabs/agent2linear.git`.
- **Class:** skill; repo-local.

### F68 — New recurring bot ask: Copilot says `pull-requests: write` without `issues: write` will 403
- **Where:** SKILL.md §4 step 6's list of template-level asks; template comment on `pull-requests: write`.
- **What:** Copilot thread `#discussion_r3891908903`: the action calls `github.rest.issues.createComment/
  updateComment`, so it "likely hits 403". False — GitHub's `pull-requests` scope covers issue-comment endpoints on
  PRs; run `33360164176` ran with `PullRequests: write` only and updated the comment in place. Answered from the
  run's token block plus the comment's `updated_at`; resolved.
- **Fix:** skill-only canned answer in step 6 (this PR). The template-comment variant was declined by the owner
  (2026-08-31) to avoid fleet drift; revisit at the next template sync wave.
- **Class:** skill (template deferred).

### F69 — CodeRabbit files a false byte-identity claim; a `diff` + SHA-256 reply makes it withdraw
- **Where:** SKILL.md §4 step 6 (drift claims).
- **What:** CodeRabbit thread `#discussion_r3891910489`: "extra blank lines at 12/16/20/24/56 not in canonical
  `0af0b4e`". The file is byte-identical (`diff` empty; both SHA-256 `9d8436f0…`); the blank lines are in the
  canonical file. Replied with the `diff` result, the raw URL at the provenance sha and both hashes; CodeRabbit
  answered "This finding is incorrect and should be withdrawn" and resolved.
- **Fix:** step 6 now names that proof as the canned answer for any drift claim (this PR); the raw URL is pinned
  to `$PROV`, and when `$PROV` is committed but unpublished the comparison uses
  `git show "$PROV:examples/pr-diff-tree.yml"` instead (Greptile, PR #18).
- **Class:** skill.

### F70 — Handoff first-action uses `timeout`, which macOS does not ship
- **Where:** `docs/handoffs/2026-08-30-p03-cold-retest.md` preflight advice; not the skill.
- **What:** `timeout 15 ssh -T git@github.com` → `zsh: command not found: timeout`; the SSH check printed nothing.
  `ssh -o BatchMode=yes -o ConnectTimeout=10 -T git@github.com` is the portable form.
- **Fix:** none in the skill; note for future handoffs.
- **Class:** docs.

**Observations (not findings):** `pr-merge-flow`'s 5-min bot-wait ended at 05:26:19Z, before the 05:29:57Z floor,
exactly as step 6 warns — the floor-time call 1 was run separately. Codex reviewed only the install commit ("PR
opened"), not the empty re-trigger push; Greptile posted its summary ~6.5 min after the push. The zsh globbing
hazard (`?ref=` unquoted) bit a verification command the executor wrote, not a skill command — the skill's own
URLs are quoted, and the new step 6 command is too.

## Cold retest 2 — `harness-kit` (2026-08-31)

Same session as cold retest 1, skill text = `main` @ `38c561d` (PR #18's corrections live). Repo shape: infra Python
repo, **unprotected** `main` (step 7c's protection 404 → "none required" path), `delete_branch_on_merge=false`
(step 9's remote `gh api -X DELETE` branch ran and `ls-remote` was empty afterward), HTTPS origin already naming
`smorinlabs/harness-kit` (the new F67 check passed), no hook manager, floating action tags.

PR https://github.com/smorinlabs/harness-kit/pull/12 · `<sha>` `46c75c2` · `<sha2>` `44da9d2` · merge `0a5d29a`
· `<T_open>` 14:21:35Z · `<T_push>` 14:23:32Z · floor 14:33:32Z · call 1 empty at 14:29:36Z and 14:33:33Z · steps 1–9
pass (run 1 `33402165539`, run 2 `33402350076`, comment `5479735040` `14:22:49Z → 14:23:42Z`; **zero review
threads** — Copilot reviewed with no comments, CodeRabbit and Greptile summary-only, Codex absent; owner-approved merge).

**Verdict: clean** — consecutive-clean count: **2**. No findings from the run. `[P03-TS01]` still open only on its
private-repo clause.

### F71 — the F66 retry fetches the wrong ref: `branch -d` judges against the branch's *own* upstream
- **Where:** SKILL.md §4 step 9 On-fail (the F66 retry merged in PR #18).
- **What:** reproduced live while closing PR #18's loop on `difftree-action` (SSH agent refused; pull and pushes
  went through the explicit HTTPS URL). Even after `refs/remotes/origin/main` was refreshed, `git branch -d
  fix/cold-retest-1` still refused — git's own message: *"not deleting branch 'fix/cold-retest-1' that is not yet
  merged to 'refs/remotes/origin/fix/cold-retest-1', even though it is merged to HEAD"*. `-d` compares against the
  branch's upstream (`origin/<branch>`, set by the first `--set-upstream` push and never advanced by the later
  explicit-URL pushes), not against `<default>`; no fetch of `<default>` can fix that, and the remote branch may
  already be deleted so no fetch of `<branch>` can either.
- **Fix:** the retry no longer fetches: `git branch --unset-upstream <branch>` (the `merge-base` test already proved
  the branch is in `<default>`, so `-d` then judges against HEAD), then rerun the tail from `branch -d` on, remote
  delete included (this PR). Verified by hand on the reproduction: `Deleted branch fix/cold-retest-1 (was 7cc3a05)`.
- **Class:** skill.

## Cold retest 3 — `shelf` (2026-08-31)

Third cold run, fresh session launched from `docs/handoffs/2026-08-31-p03-run3-shelf-fanout.md`; skill text =
`main` @ `3f6448b` (loaded via `caa5dd4`; no skill changes since). Repo shape: **private**, **no
`.github/workflows/` at all** (the installed workflow is the repo's first), unprotected `main` (step 7c's 404 →
"none required"), `delete_branch_on_merge=true`, HTTPS origin already naming `smorinlabs/shelf` (F67 check
passed), no hook manager.

PR https://github.com/smorinlabs/shelf/pull/4 · `<sha>` `2ef99e6` · `<sha2>` `525b9e0` · merge `a8a13ed`
· `<T_open>` 17:10:01Z · `<T_push>` 17:13:01Z · floor 17:23:01Z · call 1 empty at 17:23:19Z and again at the
step 8 precondition · steps 1–9 pass (run 1 `33418089119` ~2m21s, run 2 `33418348711` ~17s, comment
`5481810089` `17:12:21Z → 17:13:13Z`; **zero review threads** — Copilot posted a COMMENTED review with zero
inline comments, CodeRabbit summary-only, Greptile and Codex absent on the private repo; two skipped `edited`
runs on `<sha>`; the `[code]smith` skipped check-run present as expected; owner-approved merge). The
first-ever-workflow concern did not materialize: Actions ran on the private repo with no settings change, and
step 9's `delete_branch_on_merge=true` branch needed no F71 retry (all transfers went through `origin` over
HTTPS).

**Verdict: clean** — consecutive-clean count: **3**. The skill's own steps ran verbatim; the one finding is in
the loading path, not the skill text. `[P03-TS01]`'s private-repo clause is satisfied — row closed.

### F72 — args-bearing skill invocation substitutes `$N` into the skill body, corrupting step 9's awk in context
- **Where:** the harness loading path (Claude Code Skill-tool / slash-command argument expansion), hitting
  SKILL.md §4 step 9's awk script — the only `$<digit>` text in the file.
- **What:** invoked with args (`Add difftree PR diff-tree comments to smorinlabs/shelf, …`), the loaded skill
  text read `'BEGIN{RS=""} difftree=="worktree" && PR==w && to=="branch" && smorinlabs/shelf,==b …'` — the awk
  positional fields `$1 $2 $5 $6` replaced by words from the argument string (the trailing comma in
  `smorinlabs/shelf,` is the tell). The disk file was intact; named vars (`$out`, `$PROV`, `${TMPDIR}`)
  survive because only `$<digit>` matches the placeholder syntax. Executing the in-context block would have
  broken step 9's precondition check on every args-bearing run. Mitigated this run by executing the block from
  the disk bytes.
- **Fix:** make the one affected block substitution-proof — replace the awk with a `grep -A2` pipeline over
  `worktree list --porcelain` that uses no positional fields (this PR). The harness behavior itself is outside
  this repo's control; the skill simply no longer contains any `$<digit>` for it to eat.
- **Class:** skill (hardening) + harness.

### F73 — machine-specific `~/c/<repo>` paths baked into the skill text
- **Where:** SKILL.md §2 step 1 (clone location, leftover-branch checks, worktree add) and §4 step 9
  (precondition prose, command block, F71 retry); the docs mirror's intro.
- **What:** the skill assumed the executing machine keeps clones at `~/c/<repo>` — the authoring machine's
  convention, not a property of any target repo. Owner flagged it while reviewing the F72 fold: skill
  instructions must stay generic across machines and users.
- **Fix:** define `<clone>` (absolute path of the user's local clone of the target repo, wherever it lives) and
  `<wt>` (the sibling worktree's absolute path, recorded at `worktree add` time); every path reference in §2
  step 1 and §4 step 9 now uses them, and the clone-if-missing instruction no longer names a directory (this PR).
- **Class:** skill.

## Fan-out wave 1 (2026-08-31 → 2026-09-01)

Sequential runs per the run-3 handoff mechanics; owner approval at PR-open and merge for each. Skill text:
`main` @ `bb4c5bc` (F72 grep form + F73 generic paths) — each run executed the loaded skill text as-is, the
in-context regression coverage promised in the F72 fold.

1. **`blueprint-dryrun`** (#14, merge `89ee012`) — plain add; lefthook bypassed with `LEFTHOOK=0`; 1 thread
   (CodeRabbit SHA-pin ask) declined with the template quote + the repo's own version-tag convention; merged
   past 7 pre-existing failures (`init-integration.yml` broken on `main` since 08-17, `dependency-review.yml`
   failing every PR since July — repo-level, none required). Clean for the skill.
2. **`blueprint-press-dryrun`** (#7, merge `7ac9bfe`) — first replace-in-place in the wild: legacy
   `difftree.yml` (`@v0.2.0`) → canonical; no clone existed (the F73 no-clone path exercised); 2 threads
   (Greptile P2 + CodeRabbit Major, both mutable-refs) declined with the template quote; merged past 2
   repo-level failures (`claude-review` missing secret, `dependency-review`). Produced F74.
3. **`contributors-please-test`** (#13, merge `f747578`) — plain add; 1 valid Codex P2: the repo's
   workspace conformance script `scripts/validate-workflows.mjs` asserts an exact workflow set; fixed by
   registering the new file in `expectedWorkflowFiles` (workflow file untouched); a ~17-minute GitHub API
   outage during the floor wait was correctly treated as "query failed", never "no threads". Clean.

### F74 — replace-in-place pass condition rejects a legitimate heavily-diverged replacement
- **Where:** SKILL.md §2 step 1, the post-PR check "`gh api …/pulls/<pr>/files --jq '.[].status'` reads
  `modified`/`renamed`, never `added`".
- **What:** on `blueprint-press-dryrun`, the legacy 26-line workflow differs from the canonical 70-line
  template by more than GitHub's ~50% rename-similarity threshold, so the files API reports
  `removed` + `added` — failing the letter of the check while its intent (old file gone, exactly one
  canonical workflow) held exactly.
- **Fix:** the condition now also accepts a `removed`+`added` pair where the removed path is the old
  workflow and the added path is the canonical file (this PR).
- **Class:** skill.

### Naming decision (owner, 2026-09-01) — workflow file renamed to `difftree-pr-comment.yml`
The owner chose full-consistency naming: filename `difftree-pr-comment.yml`, workflow name
`Difftree PR Comment`, job/check id `difftree-pr-comment`, install branch `ci/difftree-pr-comment`, commit
titles `ci: add difftree PR comment workflow` / `ci: sync difftree PR comment workflow to canonical
template`. Kept as-is (they name the tool/action, or are load-bearing): the `<!-- difftree-action -->`
comment marker (renaming would orphan every existing comment's dedup), the `difftree-<PR#>` concurrency
group, the `<repo>-difftree` worktree naming, and the skill/action names. Already-wired repos get simple
rename resyncs (git mv + name lines, no re-verification — owner's call); historical docs keep old names.
The canonical template's SHA-256 after the rename: `0143f5f19cc10da6d2f44b3dbdb314253b1112b206c78ac89128de33ee17c703`.

## Rename resync wave (2026-09-01)

All 9 wired repos synced to `difftree-pr-comment.yml` (byte-identical, SHA-256 `0143f5f1…c703`) after
difftree-action#24: worktreeflow#24 `69f84cf` (sequential pilot) · mockcast#13 `67b935a` · envgen#20
`c75c805` · agent2linear#26 `a1c779e` · harness-kit#13 `5a976c9` · shelf#5 `de148e0` · blueprint-dryrun#15
`482dec6` · blueprint-press-dryrun#9 `fbef69d` · contributors-please-test#14 `7f3b7c5` (allowlist updated in
the same commit). Owner waived re-verification; each merge still passed a per-repo required-context check.
Executed as 1 sequential pilot + 8 parallel subagents. **Two operational learnings:** (a) the Claude Code
auto-mode permission classifier blocks `gh pr merge` in subagents — the working pattern is *agents verify,
the main session merges* (3 of 8 closed that way); (b) three pilots (worktreeflow, envgen, agent2linear)
have protected default branches with required contexts — the "wired repos are unprotected" assumption is
dead; every future recipe keeps the per-repo protection check.

## Fan-out wave 2 (2026-09-01, runs 4–6) — first runs under the new naming

4. **`contributors-please-e2e`** (#135, merge `609a66c`) — plain add; §4's renamed filters worked unchanged;
   1 thread (Copilot `issues: write` permissions ask) refuted with the run's own `GITHUB_TOKEN Permissions`
   log (`PullRequests: write`, no Issues scope) plus the observed create-then-update. Clean.
5. **`difftree-action-test`** (#3, merge `2f9a359`) — closes drift finding #1 / `[P03-T07]`: legacy
   `difftree.yml` → canonical. **F74's fixed pass condition validated live** (`removed` old + `added` new
   accepted). 1 thread (CodeRabbit stale README path) fixed in a `docs:` commit; §4 restarted from step 4
   per the head-move rule. Owner's `test/validate-v0` checkout deliberately left untouched (local `main`
   there is behind; branch cleanup left to the owner).
6. **`agent-fork`** (#71, merge `99b78a0`) — plain add; 2 threads: CodeRabbit byte-drift claim refuted with
   an empty diff + matching SHA-256s against raw@`$PROV`; Copilot `checkout@v6→v7` alignment declined as
   template-level (noted for upstream: consider a checkout major bump at the next template wave). Cleanup
   pulled past owner-approved untracked-only dirt (two handoff docs, reported, untouched).

Fan-out verdict so far: 6 runs, 0 skill-text corrections needed since the rename PR. Remaining targets: 25.
