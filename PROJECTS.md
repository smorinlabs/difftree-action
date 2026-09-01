# Projects

## [x] Project P01: setup-difftree skill + canonical example workflow (v0.3.0)
**Goal**: Ship an in-repo `setup-difftree` skill (loose `.claude/skills/`) that
installs the difftree CLI and scaffolds difftree-action into a repository,
backed by a single canonical `examples/pr-diff-tree.yml` that the README and the
skill both reference (one source of truth).

**Out of Scope**
- The difftree CLI repo's lightweight pointer skill (tracked in that repo).
- The Phase 1 binary-download action rework (see `PLAN.md`).

### Tests & Tasks
- [x] [P01-T01] Add canonical `examples/pr-diff-tree.yml` (consumer form, `@v0`)
- [x] [P01-TS01] `actionlint examples/pr-diff-tree.yml` passes
- [x] [P01-T02] Author `.claude/skills/setup-difftree/SKILL.md` + committed
      `.agents/skills/setup-difftree` symlink (Codex discovery)
- [x] [P01-T03] Add `docs/skills/setup-difftree.md`, README example link, and a
      "Set it up with an agent" section
- [x] [P01-TS02] `skill-quality` gate on `setup-difftree` passes
      (content ✓, docs ✓, `skillsmith verify` pass on claude-code + codex)
- [x] [P01-T04] Open PR to `smorinlabs/difftree-action` — merged as #8, released v0.3.0

## [x] Project P02: rename setup-difftree → difftree-action-setup (v0.3.0 maintenance — chore, no release)
**Goal**: Rename the skill to a `difftree-action-*` family name so it no longer
collides with the difftree CLI repo's pointer skill. **Skill names are a global
namespace** — two skills both named `setup-difftree` clobber at install
(`~/.claude/skills/setup-difftree`, `~/.agents/skills/setup-difftree`) and shadow
each other on any shared discovery path. Renamed the CLI repo's pointer to
`difftree-setup` in parallel.

### Tests & Tasks
- [x] [P02-T01] `git mv` skill dir + docs page; retarget `.agents` symlink
- [x] [P02-T02] Update SKILL.md name/H1/cross-ref and README links
- [x] [P02-TS01] `skillsmith verify` + skill-quality pass under the new name
- [x] [P02-T03] Open PR to `smorinlabs/difftree-action` — merged as #10

## [~] Project P03: Fleet rollout of difftree-action to all smorinlabs repos (v0.4.0 → v0.5.0)
**Goal/Requirement**: Every non-archived `smorinlabs` repo (40 as of 2026-08-29)
runs the canonical `pr-diff-tree.yml` workflow, installed by the
`difftree-action-setup` skill. The skill is the thing under test: pilot it on
three repos with different CI shapes, fold every gotcha back into the skill,
and fan out only after three consecutive repos need **zero skill edits**
(originally; relaxed 2026-08-30 to one clean pilot after the §4 rewrite, on a
private repo, with fan-out under per-repo §4 verification — pilot 4 did not
pass it (G17, G18); a fresh session retests the corrected skill cold).
- Findings log: `docs/rollout-findings.md` (append-only, one entry per gotcha).
- Each pilot cycle: pilot → log findings → fix skill in a worktree PR → merge →
  `git pull --ff-only` in the main checkout → `session-handoff` → next repo.
  The skill is a dev symlink into the live checkout, so a handoff written
  before the pull reloads the pre-fix skill.

**No-gotchas definition** (all five, per repo): workflow ran on the install PR
itself; comment posted; comment self-updated on a second push; PR merged clean;
zero skill edits needed.

**Out of Scope**
- Cutting a difftree-action release (the `difftree-version` default fix only
  reaches `@v0` consumers when the `v0` tag moves; the pilot runs on the
  current `@v0`).
- Archived repos (`factor-harness`, `project-harness`, `smorinlabs-marketplace`).

### Tests & Tasks
- [x] [P03-T01] Add "Verify on the PR, then merge" section to
      `difftree-action-setup` SKILL.md (+ mirror in `docs/skills/`)
- [x] [P03-T02] Default `difftree-version` to `0.3.1` (action.yml ×2, README ×2)
- [x] [P03-T03] Create `docs/rollout-findings.md` seeded with the three banked findings
- [x] [P03-T04] Pilot 1: `worktreeflow` (plain CI — cold test of the skill)
      PR #22 merged; action worked; 4 skill edits (F05, F07, F08, F14) → not clean
- [x] [P03-T05] Pilot 2: `mockcast` (release-please + commitlint gates)
      PR #11 merged `40e01fa`; action worked; 5 skill edits (F17–F21) → not clean
- [x] [P03-T06] Pilot 3: `envgen` (Rust, busiest CI, homebrew-tap workflow)
      PR #18 merged `c7a1191`; action worked; 5 skill edits (F26–F30) → not clean
- [x] [P03-TS01] One clean pilot after the §4 rewrite, on a private repo, meets all five no-gotchas criteria
      Pilot 4 not clean (G17, G18). Cold retest 1 (`agent2linear`, public, 2026-08-31) clean — owner-ratified; consecutive-clean 1. Cold retest 2 (`harness-kit`, unprotected, `delete_branch_on_merge=false`, 2026-08-31) clean, zero threads; consecutive-clean 2. Cold retest 3 (`shelf`, private, no prior workflows, 2026-08-31) clean, zero threads; consecutive-clean 3 — private-repo clause satisfied (F72 is a harness-level loading finding, not a skill-step failure).
- [ ] [P03-T07] `difftree-action-test`: rename `difftree.yml` → canonical
      `pr-diff-tree.yml` (already wired; drift finding #1)
- [ ] [P03-T08] Fan-out: `agent-fork`
- [x] [P03-T09] Fan-out: `agent2linear`
      Installed as cold retest 1 (2026-08-31): PR #25, merge `d6c64fb`; clean run, findings F66–F70.
- [x] [P03-T10] Fan-out: `blueprint-dryrun`
      Installed 2026-08-31: smorinlabs/blueprint-dryrun#14, merge `89ee012`; clean run, 1 declined SHA-pin thread; pre-existing CI failures reported (init-integration, dependency-review).
- [x] [P03-T11] Fan-out: `blueprint-press-dryrun`
      Installed 2026-09-01: smorinlabs/blueprint-press-dryrun#7, merge `7ac9bfe`; replace-in-place of legacy difftree.yml; F74 found; 2 declined mutable-ref threads.
- [ ] [P03-T12] Fan-out: `claude-openrouter-launcher`
- [ ] [P03-T13] Fan-out: `cli-standards`
- [ ] [P03-T14] Fan-out: `contributors-please`
- [ ] [P03-T15] Fan-out: `contributors-please-action`
- [ ] [P03-T16] Fan-out: `contributors-please-e2e`
- [x] [P03-T17] Fan-out: `contributors-please-test`
      Installed 2026-09-01: smorinlabs/contributors-please-test#13, merge `f747578`; 1 valid Codex finding fixed (validate-workflows allowlist registration).
- [ ] [P03-T18] Fan-out: `difftree`
- [ ] [P03-T19] Fan-out: `difftree-action` — keep as is: already runs `uses: ./` (F04)
- [ ] [P03-T20] Fan-out: `doxa-research`
- [ ] [P03-T21] Fan-out: `ge-smorin-app`
- [x] [P03-T22] Fan-out: `harness-kit`
      Installed as cold retest 2 (2026-08-31): smorinlabs/harness-kit#12, merge `0a5d29a`; clean run, zero threads, no new findings.
- [ ] [P03-T23] Fan-out: `homebrew-tap`
- [ ] [P03-T24] Fan-out: `identikit`
- [ ] [P03-T25] Fan-out: `identikit-py`
- [ ] [P03-T26] Fan-out: `identikit-pylib`
- [ ] [P03-T27] Fan-out: `identikit-rs`
- [ ] [P03-T28] Fan-out: `identikit-rslib`
- [ ] [P03-T29] Fan-out: `identikit-tslib`
- [ ] [P03-T30] Fan-out: `py-launch-blueprint`
- [ ] [P03-T31] Fan-out: `register-gated-verification`
- [ ] [P03-T32] Fan-out: `rest-standards`
- [x] [P03-T33] Fan-out: `shelf`
      Installed as cold retest 3 (2026-08-31): smorinlabs/shelf#4, merge `a8a13ed`; clean run, zero threads; finding F72 (harness-level, step 9 hardened).
- [ ] [P03-T34] Fan-out: `skillsmith`
- [ ] [P03-T35] Fan-out: `smorin-segment-timer`
- [ ] [P03-T36] Fan-out: `smorinlabs-harness`
- [ ] [P03-T37] Fan-out: `substrata`
- [ ] [P03-T38] Fan-out: `template-press`
- [ ] [P03-T39] Fan-out: `terraform-gcp-design`
- [ ] [P03-T40] Fan-out: `terraform-gcp-poc`
- [ ] [P03-T41] Fan-out: `terraform-gcp-template`
- [x] [P03-T42] Fan-out: `ts-launch-blueprint`
      installed (SHA-pinned per D-022(9)) — pilot 4, PR #27
- [ ] [P03-T43] Fan-out: `warpqueuekit`
- [x] [P03-T44] Pre-fan-out: merge difftree-action's release-please PR so `v0`
      moves (closes F03 and the release half of F06)
- [x] [P03-T45] Pre-fan-out: one batched template PR for F09/F10/F11 (+F13 only
      after a private-repo test), then re-sync already-installed repos
      Result: batched edit closes F09, F10, F11/F25, F12/F24/F33, F13, F34, F35.
- [x] [P03-T46] Re-sync worktreeflow/mockcast/envgen to the new template (PRs #23, #12, #19)
- [ ] Regression Test Status

### Deliverable
```bash
$ gh api "search/code?q=org:smorinlabs+path:.github/workflows+filename:pr-diff-tree.yml" --jq .total_count
40
```

### Automated Verification
- `actionlint examples/pr-diff-tree.yml` passes
- `skill-quality` gate on `difftree-action-setup` passes after each skill edit

### Manual Verification
- On each install PR: the `PR Diff Tree` run is green, the `<!-- difftree-action -->`
  comment exists, and after a second push the same comment (same id) is updated.
