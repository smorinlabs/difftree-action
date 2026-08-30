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

## Pilot 1 — `worktreeflow`

_(pending)_
