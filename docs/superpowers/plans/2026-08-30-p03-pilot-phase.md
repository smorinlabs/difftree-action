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
