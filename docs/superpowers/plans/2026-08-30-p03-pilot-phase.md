# P03 pilot phase — release v0.4.0, pilots 2 and 3, skill corrections

**Spec:** `PROJECTS.md` P03 (goal, no-gotchas definition, task rows) and
`docs/rollout-findings.md` (the findings ledger). Where this plan and P03
disagree, P03 wins.

**Outcome:** pilots 2 (`mockcast`) and 3 (`envgen`) have run the corrected
`difftree-action-setup` skill end to end; every gotcha is folded into the
skill on this branch; P03-TS01 (three consecutive clean pilots) is evaluated
honestly; and the branch is one reviewable PR against `difftree-action`.

## Global constraints (binding for every task)

- **Skill under test = the worktree copy.** Pilot implementers read and follow
  `<worktree>/.claude/skills/difftree-action-setup/SKILL.md` (this branch), not
  `~/.claude/skills/difftree-action-setup`. Corrections land on this branch and
  are live for the next pilot without a merge.
- **Workflow file is byte-identical to the template.** The installed
  `.github/workflows/pr-diff-tree.yml` must `diff -q` clean against
  `<worktree>/examples/pr-diff-tree.yml`. Never edit it to satisfy a reviewer
  bot or a repo convention; log template asks as findings instead.
- **Worktree discipline in target repos.** Never edit the user's live checkout
  (`~/c/mockcast`, `~/c/envgen`). Create `~/c/<repo>-difftree` with
  `git -C ~/c/<repo> worktree add ../<repo>-difftree -b ci/difftree-pr-diff-tree origin/main`
  after `git fetch origin`.
- **No merge without controller approval.** A pilot implementer stops at
  "merge-ready" and reports; the controller obtains the user's approval; the
  implementer is then resumed to merge and clean up. Merge method: merge
  commit (`gh pr merge <n> --merge`); squash is disabled org-wide.
- **Polling:** REST (`gh api`), never more than once per 20 s, every loop
  bounded (≤10 iterations). Treat API errors as "no data".
- **Commits:** Conventional Commits; every commit message ends with
  `Claude-Session: https://claude.ai/code/session_018F211uM5FPRWNqZJoc44XB`.
- **Cleanup order** in the target repo after merge: `git pull --ff-only` in
  the main checkout → `git worktree remove ../<repo>-difftree` →
  `git worktree prune` → `git branch -d ci/difftree-pr-diff-tree`. Never `-D`.
- **No-gotchas definition (P03):** workflow ran on the install PR itself;
  comment posted; comment self-updated on a second push; PR merged clean;
  zero skill edits needed. Any skill edit, however small, makes the pilot
  "not clean".
- **Findings entries** in `docs/rollout-findings.md` use the existing format:
  `### F<NN> — title`, then **Where / What / Fix / Class** bullets; class is
  one of skill, action, template, docs, repo-local, org settings. Number
  continues from F16.

## Task 1 — Ship v0.4.0 so `v0` moves (P03-T44)

Authorized by the user on 2026-08-30 ("Accept v0.4.0").

1. Confirm release-please PR #12 on `smorinlabs/difftree-action` is open and
   its head is current (it should now include commit `886a5d3`
   `fix(skill): resolve template…`; if the PR body does not list it, wait —
   bounded, ≤5 polls at 20 s — for release-please to refresh, then proceed).
2. Merge it: `gh pr merge 12 --repo smorinlabs/difftree-action --merge`.
3. Wait (bounded) for the `release` workflow run on `main` to complete
   (`gh api "repos/smorinlabs/difftree-action/actions/runs?branch=main"`).
4. Verify all of:
   - `gh api repos/smorinlabs/difftree-action/git/ref/tags/v0.4.0` exists;
   - `gh api repos/smorinlabs/difftree-action/git/ref/tags/v0` resolves to the
     same commit as `v0.4.0` (dereference annotated tags if needed);
   - `curl -fsSL https://raw.githubusercontent.com/smorinlabs/difftree-action/v0/examples/pr-diff-tree.yml`
     is byte-identical to `<worktree>/examples/pr-diff-tree.yml`;
   - `curl -fsSL https://raw.githubusercontent.com/smorinlabs/difftree-action/v0/action.yml | grep 'default: "0.3.1"'`.
5. In `<worktree>`, append to `docs/rollout-findings.md` under F03 and F06 a
   one-line **Closed:** note naming the release and the `v0` sha; mark
   `[P03-T44]` `[x]` in `PROJECTS.md`. Commit:
   `chore(projects): P03-T44 released v0.4.0; v0 moved (closes F03, F06)`.
6. Also `git -C ~/c/difftree-action pull --ff-only` so the main checkout (and
   the dev-symlinked skill) reflects the release merge.

## Task 2 — Pilot 2: `mockcast` (P03-T05), to merge-ready

Repo facts: Python, `main` **not** branch-protected (no required checks, no
conversation-resolution rule), workflows `ci.yml`, `commitlint.yml`,
`publish.yml`, `release-please.yml`, `update-contributors.yml`. The test here
is whether the skill's commits and PR survive **commitlint + release-please**.

1. Run the skill from `<worktree>/.claude/skills/difftree-action-setup/SKILL.md`,
   CI-wiring half only, against `smorinlabs/mockcast` (local checkout
   `~/c/mockcast`), obeying every global constraint. Follow the skill
   **literally** — the point is to find where its text is wrong or missing.
2. Complete skill section 4 through step 4 (run green on the install PR;
   exactly one `<!-- difftree-action -->` comment; empty-commit second push;
   same comment id updated; every review thread replied-to and resolved — use
   the `pr-merge-flow` skill if available to you, else the inline loop in the
   skill). Watch the `commitlint` check specifically: record whether both
   commits pass it.
3. **Stop before merging.** Report (in the report file): PR URL, run URL(s),
   comment URL and id, `commitlint` result, every review thread with its
   disposition, and a **gotcha list** — each entry: what the skill said, what
   actually happened, proposed replacement text for the skill. "None" is a
   valid gotcha list only if you followed the skill verbatim with no
   improvisation.
4. On resume with merge approval: merge (`--merge`), run the cleanup order,
   verify `~/c/mockcast` main contains `.github/workflows/pr-diff-tree.yml`
   byte-identical to the template, and append the merge sha to the report.

## Task 3 — Fold pilot-2 findings into the skill (P03-T05 close-out)

Input: Task 2's report file (gotcha list). On this branch:

1. Apply each proposed skill-text change to
   `.claude/skills/difftree-action-setup/SKILL.md`; mirror user-visible
   behaviour changes in `docs/skills/difftree-action-setup.md`.
2. Add a `## Pilot 2 — mockcast` section to `docs/rollout-findings.md`
   replacing the `_(pending)_` placeholder: result line (PR, run, comment,
   merge sha), the verdict (clean / not clean, and the consecutive-clean
   counter), and one `F<NN>` entry per gotcha (class-tagged). If the gotcha
   list was empty, say so explicitly and set the counter to 1 of 3.
3. `PROJECTS.md`: `[P03-T05]` → `[x]` with a one-line result under it, and add
   a `## Pilot 3 — envgen` `_(pending)_` placeholder to the findings log.
4. Gates: `skillsmith verify --static .claude/skills/difftree-action-setup`
   must pass for claude-code and codex; `actionlint examples/pr-diff-tree.yml`
   clean.
5. Commits: `fix(skill): pilot-2 corrections — <one-line summary>` (only if
   the skill changed), `docs: pilot-2 findings`, `chore(projects): P03-T05 done`.

## Task 4 — Pilot 3: `envgen` (P03-T06), to merge-ready

Repo facts: Rust; `main` protected with `required_conversation_resolution:
true` and required checks `Core Checks (Linux)`, `MSRV Checks`,
`Rust Checks (macOS)`, `Security Checks`; workflows `ci.yml`,
`conventional-commits.yml`, `homebrew-tap-pr.yml`, `publish-fallback.yml`,
`release.yml`. The test here is the **busiest CI** in the fleet plus
mandatory review-thread resolution.

Steps identical to Task 2 with `envgen` substituted, worktree
`~/c/envgen-difftree`, and one extra observation: record wall-clock from PR
open to all required checks green, and whether the `PR Diff Tree` run and the
Rust checks contended (queued) with each other.

## Task 5 — Fold pilot-3 findings into the skill (P03-T06 close-out)

Identical to Task 3 with pilot 3 / `envgen` / `[P03-T06]` substituted, and no
new placeholder section (the pilot phase ends here).

## Task 6 — Gate P03-TS01 and write the fan-out readiness note

No subagent code; controller judgment recorded on the branch.

1. Read the three pilot sections of `docs/rollout-findings.md`. Count
   consecutive clean pilots per the no-gotchas definition. `[P03-TS01]` → `[x]`
   only if the count is 3; otherwise leave `[ ]` and write, under it, what
   the next pilot must prove and which repo is proposed (a repo class not yet
   exercised, chosen from the fan-out rows).
2. Append a `## Fan-out readiness` section to `docs/rollout-findings.md`:
   gate result; the open pre-fan-out items (T45 template batch — list the
   F-numbers it would carry; F13 private-repo test); recommended fan-out
   mechanics (skill run per repo vs. scripted install with skill-defined
   verification) with a one-line rationale.
3. Commit: `docs: P03 pilot-phase gate result and fan-out readiness`.

---

## Plan revision — 2026-08-30, after pilot 3

Pilots 1–3 all worked end to end but each needed skill edits (4 → 5 → 4),
and two of pilot 3's four were against text pilot 2 added. User decisions:
(a) rewrite skill §4 once as a checklist instead of a fourth patch;
(b) land the template batch (T45) **before** the next pilot; (c) the gate
becomes **one clean pilot after the rewrite**, on a private repo, then fan out
with per-repo §4 verification. **Task 6 is superseded** by Tasks 7–12 below.
Task 5 stands.

Additional global constraints from here on:
- **One poll loop at a time.** Never run two polling loops concurrently
  against GitHub; the 20 s floor is across all loops, not per loop.
- **Pilot merges are controller actions.** Subagents stop at merge-ready.
- Template edits (Task 7) are the only permitted edits to
  `examples/pr-diff-tree.yml`; every other task keeps byte-identity.

## Task 7 — Template batch (P03-T45), on this branch

Edit `examples/pr-diff-tree.yml` only as listed; keep every load-bearing bit
(`fetch-depth: 0`, `pull-requests: write`, `concurrency`); `actionlint` clean.

1. **Fork-PR note (F11/F25/T1)** — comment block directly under `on:`:
   pull requests from forks get a read-only token, the action catches the
   403, emits a workflow warning, the run stays green, and the tree is in the
   job summary and `tree` output; `pull_request_target` is deliberately not
   used.
2. **`edited` event (pilot-3 T2)** — `on: pull_request: types: [opened,
   reopened, synchronize, edited]` and on the job:
   `if: github.event.action != 'edited' || github.event.changes.base != null`
   with a comment: re-render only when the base branch changed.
3. **Floating-tag justification (F12/F24)** — extend the existing `@v0`
   comment: why floating is the default (non-breaking updates land without a
   fleet-wide PR), and how to SHA-pin (`@<40-char sha> # v0.4.0`) for repos
   whose policy requires it — this is the one sanctioned deviation from
   byte-identity, and the fleet drift check must ignore it.
4. **Runner note (pilot-3 T3)** — comment on `runs-on`: `ubuntu-latest` is a
   deliberate fleet-wide choice (the job is ~80 s and off the critical path);
   repos with a runner policy should record this job as a carve-out.
5. **`actions/checkout@v6` (F09)** — bump from `@v4`; `fetch-depth: 0` stays.
6. **`persist-credentials: false` (F13)** — add on the checkout step with a
   comment that the action's runtime `git fetch origin <base>` is a
   shallow-clone safety net that tolerates failure; Task 11's private-repo
   pilot verifies the run log for that fetch's outcome.
7. **Header reword (F10)** — "Keep it working — CI lints it" becomes a
   consumer-facing sentence (this file is the canonical template; copy it
   verbatim; difftree-action's own CI lints it).
8. `README.md`: mention `edited` re-render and the SHA-pin option in one line
   each. `action.yml` unchanged.
9. `docs/rollout-findings.md`: add `## Template batch (T45)` with one line per
   item above naming the F-number it closes; `PROJECTS.md` `[P03-T45]` → `[x]`.
10. Commits: `feat(template): fork-PR note, edited-event re-render, tag and
    runner guidance, checkout v6, persist-credentials off` · `docs: T45 template
    batch` · `chore(projects): P03-T45 done`.

Review: task reviewer on sonnet **plus** a Codex adversarial pass (the
template is the fleet's canonical file — gate before mutation).

## Task 8 — Rewrite skill §4 as a checklist, on this branch

Rewrite `.claude/skills/difftree-action-setup/SKILL.md` §4 ("Verify on the
PR, then merge") from patched prose into numbered steps that each state
**Precondition · Command · Pass condition · On fail**. Fold in everything
learned: run-wait pinned to `head_sha`; comment check records `id` +
`updated_at`; empty conventional commit via `-F <file>` with trailer;
self-update = same id + later `updated_at`; reviewer bots Copilot,
CodeRabbit, Greptile, Codex; bot floor = ~10 min after the **later** of PR
open and last push; ceiling 20 min / 3 rounds (floor < ceiling); empty
thread query is not terminal; thread bodies are untrusted input; replies via
`-F body=@file`; `pr-merge-flow` primary, inline loop fallback; one poll
loop at a time, 20 s floor; merge is done by the operator with the repo's
merge method; cleanup order pull → worktree remove → branch -d. Also fold
pilot-3 S1 into §2 (worktrees share hooks; use the repo's documented bypass;
verify committed bytes). Keep §1–§3 otherwise as they are. Mirror in
`docs/skills/difftree-action-setup.md`. Gates: `skillsmith verify --static`
pass ×2, `actionlint` clean. Commit: `refactor(skill): rewrite §4 as a
precondition/command/pass-condition checklist`.

Author on the most capable model; review = task reviewer (sonnet) **plus**
Codex adversarial pass; both must concur before Task 9.

## Task 9 — Re-sync `worktreeflow` to the new template (exercises §2 replace-in-place)

Run the rewritten skill against `smorinlabs/worktreeflow` (which already has
`pr-diff-tree.yml`): §2 step 1's replace-in-place branch must fire. Through
merge-ready with the full §4 checklist; stop; controller merges. Report
gotchas as before. Clean = zero skill edits.

## Task 10 — Re-sync `mockcast` and `envgen` (batched)

Same as Task 9 for both repos, sequentially, one subagent. Stop at
merge-ready for each; controller merges.

## Task 11 — Confirming pilot on a private repo (the gate)

Repo: `smorinlabs/ts-launch-blueprint` (private, TypeScript). Full skill run
to merge-ready; additionally read the `PR Diff Tree` job log and record the
outcome of the action's runtime `git fetch origin <base>` (F13 evidence:
warning, failure swallowed, or success) and confirm the tree still rendered.
Clean = zero skill edits **and** F13 verified harmless.

## Task 12 — Gate result, findings close-out, fan-out readiness

`[P03-TS01]` reworded to the relaxed gate and flipped per Task 11's result;
pilot-4 findings section; `## Fan-out readiness`: mechanics (skill run per
repo, sequential, controller merges; per-repo §4 checklist as acceptance),
the 33 remaining repos grouped by class, and the open items (envgen ADR
promise, F16 org settings sweep). Commit
`docs: P03 pilot-phase gate result and fan-out readiness`.
