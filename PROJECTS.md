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
runs the canonical `difftree-pr-comment.yml` workflow (renamed from `pr-diff-tree.yml` 2026-09-01), installed by the
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
- [x] [P03-T07] `difftree-action-test`: rename `difftree.yml` → canonical
      Synced 2026-09-01 as fan-out run 5: smorinlabs/difftree-action-test#3, merge `2f9a359` (canonical name is now `difftree-pr-comment.yml`); drift finding #1 closed; F74 fix validated live.
- [x] [P03-T08] Fan-out: `agent-fork`
      Installed 2026-09-01: smorinlabs/agent-fork#71, merge `99b78a0`; clean run, 2 threads (drift claim refuted by hash, checkout-version ask declined).
- [x] [P03-T09] Fan-out: `agent2linear`
      Installed as cold retest 1 (2026-08-31): PR #25, merge `d6c64fb`; clean run, findings F66–F70.
- [x] [P03-T10] Fan-out: `blueprint-dryrun`
      Installed 2026-08-31: smorinlabs/blueprint-dryrun#14, merge `89ee012`; clean run, 1 declined SHA-pin thread; pre-existing CI failures reported (init-integration, dependency-review).
- [x] [P03-T11] Fan-out: `blueprint-press-dryrun`
      Installed 2026-09-01: smorinlabs/blueprint-press-dryrun#7, merge `7ac9bfe`; replace-in-place of legacy difftree.yml; F74 found; 2 declined mutable-ref threads.
- [x] [P03-T12] Fan-out: `claude-openrouter-launcher`
      Installed 2026-09-01 (wave 3): #6, merge `a762a02`; agent stalled, main session completed (F75); SHA-pin declined.
- [x] [P03-T13] Fan-out: `cli-standards`
      Installed 2026-09-01 (wave 3): #4, merge `139e727`; clean.
- [x] [P03-T14] Fan-out: `contributors-please`
      Installed 2026-09-01 (wave 3): #34, merge `86fbc68`; clean, 12 required contexts green.
- [x] [P03-T15] Fan-out: `contributors-please-action`
      Installed 2026-09-01 (wave 3): #55, merge `962659c`; clean.
- [x] [P03-T16] Fan-out: `contributors-please-e2e`
      Installed 2026-09-01: smorinlabs/contributors-please-e2e#135, merge `609a66c`; clean run, permissions ask refuted with run evidence.
- [x] [P03-T17] Fan-out: `contributors-please-test`
      Installed 2026-09-01: smorinlabs/contributors-please-test#13, merge `f747578`; 1 valid Codex finding fixed (validate-workflows allowlist registration).
- [x] [P03-T18] Fan-out: `difftree`
      Synced 2026-09-01 (wave 3): #17, merge `4d23cae`; replace-in-place of legacy difftree.yml (`@v0.1.0`); clean.
- [-] [P03-T19] Fan-out: `difftree-action` — keep as is: already runs `uses: ./` (F04)
      Closed 2026-09-01: never a target — the dogfood `difftree.yml` runs `uses: ./` by design; only its display name was aligned in #24.
- [x] [P03-T20] Fan-out: `doxa-research`
      Installed 2026-09-01 (wave 3): #141, merge `e389e47`; merged past a new bandit/Hygiene drift failure (owner call).
- [x] [P03-T21] Fan-out: `ge-smorin-app`
      Installed 2026-09-01 (wave 3): #1, merge `22fe4e8`; private first workflow; local `main` diverged — owner to reconcile.
- [x] [P03-T22] Fan-out: `harness-kit`
      Installed as cold retest 2 (2026-08-31): smorinlabs/harness-kit#12, merge `0a5d29a`; clean run, zero threads, no new findings.
- [x] [P03-T23] Fan-out: `homebrew-tap`
      Installed 2026-09-01 (wave 3): #5, merge `053a7f6`; merged past pre-existing test-bot failures (owner call).
- [x] [P03-T24] Fan-out: `identikit`
      Installed 2026-09-01 (wave 4): #5, merge `e5008b7`; clean.
- [x] [P03-T25] Fan-out: `identikit-py`
      Installed 2026-09-01 (wave 4): #1, merge `bf87f77`; first workflow; clean.
- [x] [P03-T26] Fan-out: `identikit-pylib`
      Installed 2026-09-01 (wave 4): #1, merge `18905eb`; first workflow; clean.
- [x] [P03-T27] Fan-out: `identikit-rs`
      Installed 2026-09-01 (wave 4): #1, merge `0ae1c24`; first workflow; clean.
- [x] [P03-T28] Fan-out: `identikit-rslib`
      Installed 2026-09-01 (wave 4): #1, merge `8c0f300`; first workflow; clean.
- [x] [P03-T29] Fan-out: `identikit-tslib`
      Installed 2026-09-01 (wave 4): #1, merge `31da60f`; first workflow; clean.
- [x] [P03-T30] Fan-out: `py-launch-blueprint`
      Synced 2026-09-01 (wave 4): #524, merge `6094f23`; replace-in-place; press-rules remove rule retargeted (F76).
- [x] [P03-T31] Fan-out: `register-gated-verification`
      Installed 2026-09-01 (wave 4): #1, merge `16b7a61`; first workflow; clean.
- [x] [P03-T32] Fan-out: `rest-standards`
      Installed 2026-09-01 (wave 3): #14, merge `5ad550a`; clean, 2 SHA-pin threads declined.
- [x] [P03-T33] Fan-out: `shelf`
      Installed as cold retest 3 (2026-08-31): smorinlabs/shelf#4, merge `a8a13ed`; clean run, zero threads; finding F72 (harness-level, step 9 hardened).
- [x] [P03-T34] Fan-out: `skillsmith`
      Installed 2026-09-01 (wave 4): #47, merge `d97fbc1`; private; owner clone on docs/landing-page left un-pulled.
- [x] [P03-T35] Fan-out: `smorin-segment-timer`
      Installed 2026-09-01 (wave 3): #6, merge `25144c5`; private first workflow; clean.
- [x] [P03-T36] Fan-out: `smorinlabs-harness`
      Installed 2026-09-01 (wave 5): #45, merge `2179068`; clean.
- [x] [P03-T37] Fan-out: `substrata`
      Installed 2026-09-01 (wave 4): #3, merge `b993211`; merged past pre-existing claude-review failure (owner call).
- [x] [P03-T38] Fan-out: `template-press`
      Installed 2026-09-01 (wave 5): #106, merge `c0992d8`; press `[[remove]]` rule added (F76 class); hung Windows runner cancelled+rerun to land ci-ok.
- [x] [P03-T39] Fan-out: `terraform-gcp-design`
      Installed 2026-09-01 (wave 5): #1, merge `ebbd545`; private first workflow; clean.
- [x] [P03-T40] Fan-out: `terraform-gcp-poc`
      Installed 2026-09-01 (wave 5): #1, merge `d069835`; private; clean.
- [x] [P03-T41] Fan-out: `terraform-gcp-template`
      Installed 2026-09-01 (wave 5): #1, merge `14ae771`; merged past pre-existing gates failure (owner call).
- [x] [P03-T42] Fan-out: `ts-launch-blueprint`
      installed (SHA-pinned per D-022(9)) — pilot 4, PR #27
- [x] [P03-T43] Fan-out: `warpqueuekit`
      Installed 2026-09-01 (wave 5): #5, merge `988dd5a`; private; clean.
- [x] [P03-T44] Pre-fan-out: merge difftree-action's release-please PR so `v0`
      moves (closes F03 and the release half of F06)
- [x] [P03-T45] Pre-fan-out: one batched template PR for F09/F10/F11 (+F13 only
      after a private-repo test), then re-sync already-installed repos
      Result: batched edit closes F09, F10, F11/F25, F12/F24/F33, F13, F34, F35.
- [x] [P03-T46] Re-sync worktreeflow/mockcast/envgen to the new template (PRs #23, #12, #19)
- [ ] Regression Test Status

### Deliverable
```bash
$ gh api "search/code?q=org:smorinlabs+path:.github/workflows+filename:difftree-pr-comment.yml" --jq .total_count
40
```

### Automated Verification
- `actionlint examples/pr-diff-tree.yml` passes
- `skill-quality` gate on `difftree-action-setup` passes after each skill edit

### Manual Verification
- On each install PR: the `PR Diff Tree` run is green, the `<!-- difftree-action -->`
  comment exists, and after a second push the same comment (same id) is updated.

## [x] Project P04: Colored PR comment via GitHub inline math, plain as opt-in (v0.6.0)
**Goal/Requirement**: The sticky PR comment renders in color by default —
status marks by git state, `+N`/`−M` churn, and the summary line, mirroring
`difftree`'s terminal colors — using GitHub's inline-math renderer
(one `` $`…`$ `` expression per line). `color: "false"` restores today's plain
code-fence comment byte-for-byte. Large trees are split inside one comment:
the first lines (up to `MAX_COLOR_EXPRESSIONS = 100`) in color, the remainder
in the plain fence under a one-line notice, the summary line colored last.
- Rendering rules and limits were measured on GitHub (2026-09-01;
  `smorinlabs/harness-kit` issues #14–#20, PR #13): ~145 expressions per page,
  arrays cannot be left-aligned (MathML Core), `\phantom`/`\unicode` banned,
  backtick unencodable. Design + evidence:
  `docs/superpowers/specs/2026-09-01-color-comment-design.md`.
- Codex adversarial review of the plan (v3 → v4) resolved: byte-budget for the
  colored section, ordering with `truncateTree`, backtick coverage for
  header/root/footer, canary + rollback for the `v0` flip.

**Out of Scope**
- Any change to the difftree CLI or to the `Run difftree` step (`--no-color`,
  `--json`), the `tree`/`files-changed` outputs, or the job summary.
- A configurable threshold input (constant `MAX_COLOR_EXPRESSIONS` for now).

### Tests & Tasks
- [x] [P04-T01] Probe GitHub's renderer; settle format, palette, escape table, limits (harness-kit #14–#20)
- [x] [P04-T02] Plan v3 + Codex adversarial review → plan v4 (`scratchpad`, folded into the spec)
- [x] [P04-TS01] Golden matrix: `color:false` × {empty, truncated, advertise} == pre-change bodies (`test/fixtures/plain-golden.json`)
- [x] [P04-TS02] Escapes, mark/palette maps, line rendering, PR #24 fixture (`test/fixtures/pr24-tree.txt`), hybrid split, byte budget, CRLF (`test/color.test.js`)
- [x] [P04-T03] `scripts/comment.js`: `escapeTexttt`, `renderColorLine`, `splitForColor`, `composeBody({ color })`
- [x] [P04-T04] `action.yml`: `color` input (default `"true"`) → `DIFFTREE_COLOR` → `composeBody`
- [x] [P04-T05] Docs: README (real sample, inputs row, limits), example workflow, PRD, SKILL input list, RUNBOOK check
- [x] [P04-T06] Spec `docs/superpowers/specs/2026-09-01-color-comment-design.md`
- [x] [P04-T10] Guide `docs/github-math-color-guide.md`: what works, "don't do this", gotchas, troubleshooting
- [x] [P04-T11] Catalog `examples/github-math-color-examples.md`: copy-paste samples generated by the shipped renderer
- [x] [P04-T13] Fix GitHub autolinking inside math (SHA/@/# tokens split across groups; evidence: canary comment body_html) before v0.6.0
- [x] [P04-T12] Fix indentation drift for pure-space prefixes (invisible `│` spacer; probe I, harness-kit #22) before v0.6.0
- [x] [P04-T07] Merge PR #26 (merge commit `76c4b6a`) → `git pull --ff-only` in the main checkout
- [x] [P04-TS03] Dogfood: PR #26's own comment rendered in color (owner-verified light + dark); seam split verified on harness-kit #21; `color: "false"` byte-identity pinned by the golden matrix
- [x] [P04-T08] Canary: `ts-launch-blueprint#28` pinned to `ee68803` rendered the colored comment (surfaced the autolink bug → PR #30), then re-pinned to `v0.6.0`
- [x] [P04-T09] Release PR #22 merged 2026-09-01 → tag `v0.6.0` (`0195d79`), `v0` moved by release.yml; fleet renders in color on next PR events
- [ ] Regression Test Status

### Deliverable
```bash
$ node --test
ℹ pass 37
ℹ fail 0
```
A PR on any installed repo shows the colored tree; `color: "false"` shows the plain fence.

### Automated Verification
- `node --test` passes (golden matrix proves the plain path is unchanged)
- `actionlint action.yml examples/difftree-pr-comment.yml` and the CI shellcheck step pass

### Manual Verification
- Dogfood comment on the implementation PR: colored marks/churn, left-aligned rows, light and dark theme
- A >100-line PR shows colored head + notice + plain fence + colored footer in one comment

## [~] Project P05: banksheets fleet rollout of difftree-action (v0.6.1 — docs/tracker only, no release)
**Goal/Requirement**: Every non-archived `banksheets` repo (9 as of 2026-09-01, the fork
mirror `get-bank-sheets-web-fork` opted in by the owner at the PR-open gate) runs the canonical `difftree-pr-comment.yml` workflow, installed by
the `difftree-action-setup` skill using the parallel wave pattern proven on the
40-repo smorinlabs rollout (P03): controller preps worktrees → one batch PR-open
gate → verify-only subagents run §2–§4 through step 7 → controller answers
threads, takes one consolidated merge gate, merges pinned, cleans up.
- Handoff of record: `docs/handoffs/2026-09-01-banksheets-difftree-fanout.md`.
- Wave log and any new findings (F77+) append to `docs/rollout-findings.md`.
- Canonical template at wave time: provenance `b70ce28`, SHA-256 `c0e126bd…`
  (71 lines) — re-derived at run time, not copied from the handoff.
- All repos are private; calibration per the handoff (protection 404 = none
  required; an empty thread set at the floor is genuinely none).

**Out of Scope**
- Any smorinlabs work, including the 33-repo resync to the post-`b70ce28` template.
- Skill-text changes (fold any gotcha as an F-entry; edit the skill in its own PR).

### Tests & Tasks
- [x] [P05-T01] Recon sweep over all 9 targets (read-only, parallel) → facts table at the PR-open gate
- [x] [P05-T02] Fan-out: `get-bank-sheets-web`
- [x] [P05-T03] Fan-out: `get-bank-sheets-site`
- [x] [P05-T04] Fan-out: `get-bank-sheets-mcp`
- [x] [P05-T05] Fan-out: `banksheets-landing` (clone on `docs/terraform-infra-design` → partial cleanup expected)
- [x] [P05-T06] Fan-out: `banksheets-loops`
- [x] [P05-T07] Fan-out: `rpi-artifacts`
- [x] [P05-T08] Fan-out: `banksheets-harness`
- [x] [P05-T09] Fan-out: `terraform-stripe`
- [x] [P05-T11] Fan-out: `get-bank-sheets-web-fork` (fork mirror; same-repo PR against the fork's own `main`)
- [x] [P05-TS01] F75 re-derivation from the API before the merge gate: per repo ≥ 2 success runs, one comment updated twice, 0 unresolved threads, checks green, mergeable
- [~] [P05-T10] Fold PR: wave log + findings (F77+) in `docs/rollout-findings.md`, tracker ticks
- [ ] Regression Test Status

### Deliverable
```bash
$ for r in get-bank-sheets-web get-bank-sheets-site get-bank-sheets-mcp banksheets-landing banksheets-loops rpi-artifacts banksheets-harness terraform-stripe get-bank-sheets-web-fork; do
    gh api "repos/banksheets/$r/contents/.github/workflows/difftree-pr-comment.yml" --jq .sha >/dev/null && echo "$r ok"; done | wc -l
9
```

### Automated Verification
- Each merged workflow file is byte-identical to `examples/difftree-pr-comment.yml`
  at the recorded provenance (SHA-256 match), modulo the sanctioned SHA-pin line

### Manual Verification
- On each install PR: the `Difftree PR Comment` run is green, the
  `<!-- difftree-action -->` comment exists, and after the empty re-trigger commit
  the same comment (same id) carries a strictly later `updated_at`.
