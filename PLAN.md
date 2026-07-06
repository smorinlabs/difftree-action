# difftree-action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development or superpowers:executing-plans to
> implement remaining tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `smorinlabs/difftree-action@v1` per [`GOAL.md`](./GOAL.md) and the
functional contract in [`PRD.md`](./PRD.md): a thin GitHub Action that, on a pull
request, runs `difftree --pr` and upserts a sticky ASCII diff-tree comment.

**Architecture:** Mirror the `contributors-please-action` engine→wrapper split.
`difftree` is the engine (a Rust binary that already implements `--pr`);
`difftree-action` is the wrapper that resolves the base ref, ensures base
history, runs `difftree`, and posts one self-updating PR comment. Delivered in
two phases: **Phase 0** composite (build difftree from source, ships now) →
**Phase 1** node24 TypeScript (download a prebuilt difftree binary, the target).

**Tech Stack:** Phase 0 — composite `action.yml`, `dtolnay/rust-toolchain`,
`Swatinem/rust-cache`, `actions/github-script`. Phase 1 — TypeScript, Node 24,
`@actions/core` / `@actions/github` / `@actions/exec` / `@actions/tool-cache`,
ncc for the committed bundle, vitest for unit/integration, `release-please` for
versioning, GitHub Actions for CI/E2E gates.

---

## Evidence Baseline

- [`GOAL.md`](./GOAL.md) requires this plan to map every `difftree-action`
  component to a `contributors-please-action` analog and to sequence the phased
  build (GOAL §2 step 5, §6).
- Local reference and implementation checkouts exist at:
  - `/Users/stevemorin/c/difftree-action/` — this repo. Currently scaffolded with
    `README.md` + `LICENSE` (MIT, 2026) on `main`; the four planning docs
    (`PROMPT.md`, `GOAL.md`, `PRD.md`, `PLAN.md`) added by this work.
  - `/Users/stevemorin/c/difftree/` — the engine. Rust CLI, MIT. **Already
    implements** `--pr [<ref>]` (merge-base→HEAD,
    base auto-detect `origin/HEAD → main → master`), `--committed`, `--against`,
    `--range`, `--json` (schema `difftree.v2` as of 0.3.0 — the action never reads
    `schema_version`, only `summary.files_changed`), git status marks, `--no-color`,
    `--level`, `--dirs-only`. CLI defined in `src/app.rs`; comparison routing in
    `src/main.rs`; diff logic + `resolve_pr_base` in `src/lib.rs`; `--pr` tests in
    `tests/cli.rs`. Uses the `git2`/libgit2 crate (11 `git2::` call sites, no
    shelling out to `git`), which constrains shallow-checkout behavior and is why
    the action requires `fetch-depth: 0` (PRD FR-2.3 / OQ4). **Released as
    `difftree 0.3.0` on crates.io and git tag `v0.3.0`** (PR #4, merged
    2026-06-28; `--pr` confirmed in both `origin/main` and the tag, verified
    2026-06-29) — so Phase 0 installs via `cargo install difftree@0.3.0` (OI1
    resolved). **Still no prebuilt GitHub Release binaries** — that remains the
    Phase 1 gate (PRD §8.3); difftree now has a release-please / crates.io
    pipeline (its PR #8) that could add them.
  - `/Users/stevemorin/c/github-actions/contributors-please-action/` — the
    structural template: node24 action, `action.yml`, `src/index.ts` thin
    wrapper, `maybeCommentOnPullRequest()` sticky comment via
    `<!-- contributors-please:check-comment -->`, ncc `dist/index.js` committed
    and byte-verified in CI, `release-please`, outputs-consistency check,
    `.contributors-please-engine-ref` version pin.
  - `/Users/stevemorin/c/github-actions/contributors-please/` — the engine
    template (npm library + CLI). Relevant only as the analog for "how the engine
    is versioned and consumed"; difftree diverges by being a binary.
- Current external state, refreshed 2026-06-27: `smorinlabs/difftree-action` repo
  created (public, MIT, `main`, README + LICENSE). `smorinlabs/difftree` has no
  releases/tags. No GitHub App is needed for this action.

## contributors-please-action → difftree-action Analogy Map

| contributors-please-action file/concept | difftree-action target | Borrow | Diverge |
|---|---|---|---|
| `action.yml` (node24, 21 inputs, 11 outputs, branding) | `action.yml` | Node action manifest, branding, declared outputs. | ~7 inputs / 3 outputs (PRD §7); Phase 0 variant is `using: composite`. |
| `src/index.ts` (parse inputs → construct engine → dispatch → emit outputs) | `src/index.ts` | Thin-wrapper control flow and output emission. | Steps are resolve-base → fetch-base → run binary → upsert comment; no engine `import`. |
| engine consumed via `file:../contributors-please` + `copy-library.mjs` bundle | `difftree` binary via `@actions/tool-cache` download | Single pinned engine version drives the run. | Binary is fetched/cached at action time (Phase 1) or `cargo install`-ed (Phase 0), never bundled. |
| `.contributors-please-engine-ref` | `difftree-version` input + pinned default | Pin which engine version runs. | Lives as an input default rather than a tracked file (smaller surface). |
| `maybeCommentOnPullRequest()` + `upsertIssueComment()` | `upsertComment()` keyed on `<!-- difftree-action -->` | Marker-based sticky create-vs-update. | Body is a fenced diff-tree, not a diff of stale files. |
| `app-token.ts` + identity lookup (App/PAT) | — (removed) | — | Comment-only ⇒ `GITHUB_TOKEN` suffices; no write identity. |
| `scripts/check-engine-sync.mjs` | — (removed) | — | No engine npm sync; version is a simple input default. |
| `scripts/check-action-outputs` consistency | same script | Grep `core.setOutput()` ↔ `action.yml outputs:`; fail on drift. | Three outputs only. |
| ncc `build` + committed `dist/` + `git diff --exit-code -- dist` | same | Reproducible committed bundle gate. | Phase 1 only (Phase 0 composite has no `dist/`). |
| `release-please-config.json` + `.release-please-manifest.json` + moving `v1` tag | same | Conventional-commit releases, major-tag move. | Direct borrow. |
| `proxy.ts` (HTTPS_PROXY) | optional | Borrow only if tool-cache download/API needs proxy support. | Likely unnecessary for comment-only auth. |
| `test/index.test.ts` (API mocked, PR-comment assertions) | `test/index.test.ts` | vitest with mocked GitHub API + tmp-git fixtures. | Cover PRD FR matrix (GOAL §7.2). |

## Repository File Layout

### Phase 0 (`difftree-action`, composite)

- Create: `action.yml` (`using: composite`) with steps: toolchain, rust-cache,
  `cargo install` pinned difftree, `git fetch` base, run difftree, github-script
  sticky comment.
- Create: `scripts/comment.js` (or inline `actions/github-script`) implementing
  marker-based upsert with `github.token`.
- Create/maintain: `README.md` (usage + permissions), `LICENSE` (exists).
- Create: `.github/workflows/ci.yml` (lint/shellcheck the composite + a smoke run).
- Create: `.github/workflows/e2e.yml` (scheduled/manual scratch-repo open→push).

### Phase 1 (`difftree-action`, node24)

- Create/maintain: `package.json`, `tsconfig.json`, `vitest.config.ts`,
  `.gitignore`, `README.md`, `LICENSE`.
- Replace `action.yml` with `using: node24, main: dist/index.js`; declare every
  PRD §7.2 output; Marketplace branding.
- Create: `src/index.ts` thin wrapper (input parse local while surface is small).
- Create: `src/difftree.ts` — resolve/download/cache the binary
  (`@actions/tool-cache`) and run it (`@actions/exec`); build arg list.
- Create: `src/comment.ts` — compose body + marker-based `upsertComment()` via
  `@actions/github` Octokit.
- Create: `scripts/check-action-outputs.mjs` — outputs-consistency gate.
- Create: `test/*.test.ts` per the §7 matrix.
- Commit: `dist/index.js` (ncc, byte-reproducible).
- Add: `release-please-config.json`, `.release-please-manifest.json`,
  `.github/workflows/{ci,release,release-please,e2e}.yml`.

### `difftree` (engine — Phase 1 prerequisite, separate repo)

- Add a release workflow producing cross-platform binaries (e.g. `cargo-dist`)
  attached to `v*` GitHub Releases; cut an initial tag (`v0.1.0`). Tracked in
  GOAL §5 P2 — not part of this repo's code.

---

## Task 1: Phase 0 — Composite action skeleton

Files:
- Create: `action.yml`
- Create: `.github/workflows/ci.yml`

- [ ] Step 1: Write `action.yml` with `using: composite` and inputs from PRD §7.1
  (`base-ref`, `comment`, `level`, `dirs-only`, `extra-args`, `difftree-version`,
  `github-token`).
- [ ] Step 2: Add composite steps: `Swatinem/rust-cache@v2` (rustup is preinstalled
  on GitHub-hosted runners), then `cargo install difftree@${{ inputs.difftree-version }}`
  from crates.io (default `0.3.0`). OI1 resolved — pin to the crates.io version,
  not a git tag/rev.
- [ ] Step 3: Resolve `$BASE_REF` from the `base-ref` input or
  `github.event.pull_request.base.ref`. Require `fetch-depth: 0` in the README /
  workflow example (PRD FR-2.3). As best-effort, when the checkout is shallow
  (`git rev-parse --is-shallow-repository`), attempt `git fetch --unshallow
  --no-tags origin "$BASE_REF"`; if `merge-base` still can't resolve, fail with a
  `difftree-action:` error naming `fetch-depth: 0` (do not post an empty tree).
- [ ] Step 4: Add a step running `difftree --pr "origin/$BASE_REF" --committed
  --no-color` (plus `--level`/`--dirs-only`/`extra-args` when set), capturing
  stdout to an output. Use the remote-tracking ref `origin/$BASE_REF` — the CI
  checkout is detached HEAD with no local base branch (PRD FR-2.1).
- [ ] Step 5: CI workflow lints `action.yml` and shell steps (actionlint +
  shellcheck) and runs a smoke job on a synthetic two-commit repo.

## Task 2: Phase 0 — Sticky comment via github-script

Files:
- Create: `scripts/comment.js`
- Modify: `action.yml`

- [ ] Step 1: Write a fixture-level test (Node, run under vitest or `node --test`)
  for `composeBody(tree, { empty, truncated })` and `pickExisting(comments,
  marker)`: empty-tree body, normal body with code fence + marker, truncation
  notice, find-existing-by-marker.
- [ ] Step 2: Verify the tests fail (functions absent).
- [ ] Step 3: Implement `composeBody` + `pickExisting`; wire an
  `actions/github-script` step that lists PR comments, calls `pickExisting`, and
  creates or updates with `composeBody` using `github.token`.
- [ ] Step 4: Verify tests pass.
- [ ] Step 5: Gate on `comment === 'false'` (skip post, still set outputs) and on
  fork read-only token (catch POST 403 → warning, exit 0) per PRD FR-4.3 / FR-5.3.

## Task 3: Phase 0 — Outputs & summary

Files:
- Modify: `action.yml`, `scripts/comment.js`

- [ ] Step 1: Add a test asserting `files-changed` is parsed from difftree's
  summary line (or `--json` `summary.files_changed`) and `tree`/`comment-url` are
  emitted.
- [ ] Step 2: Verify failure, implement parsing + `core.setOutput`/step outputs,
  verify pass.
- [ ] Step 3: Write base ref used / files changed / comment posted to
  `$GITHUB_STEP_SUMMARY` (PRD FR-6.2).

## Task 4: Phase 0 — CI, dogfood, RUNBOOK

Files:
- Create: `.github/workflows/ci.yml` (lint + unit + smoke)
- Create: `.github/workflows/difftree.yml` (dogfood usage on this repo's PRs)
- Create: `docs/RUNBOOK.md`

- [x] Step 1: `ci.yml` runs `node --test`, `actionlint`, shellcheck of the
  embedded `action.yml` bash, and a `smoke` job that runs `uses: ./` with
  `comment: false` and asserts a change count (works on forks; no side effects).
- [x] Step 2: `difftree.yml` dogfoods the action on this repo's own PRs
  (`comment: true`, `pull-requests: write`) — the live open→push→update check.
- [x] Step 3: RUNBOOK documents the manual acceptance (open→push→update sticky,
  `comment:false`, fork PR) and the rendering-flag legibility check (PRD OQ1 / OI3).
- [ ] Step 4: Tag `v0.x` and move major tag `v0`; a fully scripted scratch-repo
  E2E (programmatic PR open→push) is deferred beyond Phase 0 (see RUNBOOK).

## Task 5: difftree binary releases (engine prerequisite — separate repo)

Files (in `smorinlabs/difftree`):
- Create: `.github/workflows/release.yml` (or `cargo-dist` config)

- [ ] Step 1: Add cross-platform binary build (linux/macos/windows × x86_64/arm64)
  attached to `v*` releases.
- [ ] Step 2: Cut `v0.1.0` (and onward) with attached binaries.
- [ ] Step 3: Confirm the asset naming/layout the action's downloader will target.

> Gate: Phase 1 (Tasks 6–10) does not start until Task 5 ships at least one
> release with downloadable binaries.
>
> **Status 2026-06-30:** difftree PR #12 (`ci/release-binaries`) implements this —
> matrix builds on `release: published` + `workflow_dispatch(tag)` backfill.
> Asset contract: `difftree-<tag>-<target>.tar.gz` (unix) / `.zip` (windows),
> each with a `.sha256`; targets x86_64/aarch64 × linux-gnu/apple-darwin plus
> x86_64-pc-windows-msvc. difftree `v0.3.1` is now released; backfill both
> v0.3.0 and v0.3.1 after merge.
>
> **Phase 1 decision note (OI: binary-download vs cargo-install):** keep the
> prebuilt-binary design. A node24 action that still `cargo install`s would pay
> the same 1–3 min cold compile as Phase 0 and gain little; the binary download
> is seconds and the asset contract above makes the OS/arch mapping
> deterministic. Composite Phase 0 remains the fallback path. Follow-up (not
> Phase 1-gated): bump the action's default `difftree-version` 0.3.0 → 0.3.1
> after verifying `cargo install difftree@0.3.1 --locked`.

## Task 6: Phase 1 — node24 bootstrap

Files:
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/index.ts` (stub), `test/smoke.test.ts`

- [ ] Step 1: Write a failing smoke test importing the action's `run()` entry and
  asserting it no-ops + exits 0 off the `pull_request` event (PRD FR-1.1).
- [ ] Step 2: Verify failure; add tooling (deps: `@actions/core`,
  `@actions/github`, `@actions/exec`, `@actions/tool-cache`; dev: ncc, typescript,
  vitest) + minimal `run()`.
- [ ] Step 3: Verify pass; add `build` (ncc → `dist/index.js`) and `check` scripts.

## Task 7: Phase 1 — Binary acquisition (`src/difftree.ts`)

Files:
- Create: `src/difftree.ts`, `test/difftree.test.ts`

- [ ] Step 1: Failing tests for `binaryAsset(os, arch, version)` mapping and
  `buildArgs({ base, level, dirsOnly, extraArgs })` → `['--pr', `origin/${base}`,
  '--committed', '--no-color', …]` — note the base is the remote-tracking ref
  (PRD FR-2.1 / FR-3.x).
- [ ] Step 2: Verify failure; implement asset mapping + `tool-cache`
  download/cache + `buildArgs`; run via `@actions/exec` capturing stdout/exit.
- [ ] Step 3: Verify pass; error path when the asset is missing for the runner
  arch (PRD FR-5.1) and when difftree exits non-zero (PRD FR-5.2).

## Task 8: Phase 1 — Base resolution & fetch (`src/index.ts`)

Files:
- Modify: `src/index.ts`; Create: `test/base.test.ts`

- [ ] Step 1: Failing tests: base default from `pull_request.base.ref`,
  `base-ref` override, that the base is passed as `origin/<base>`, and that a
  shallow checkout triggers a best-effort `git fetch --unshallow` before difftree
  (PRD FR-2.x).
- [ ] Step 2: Verify failure; implement resolution + the shallow-detect/unshallow
  `@actions/exec` path; surface an unresolvable merge-base as a `difftree-action:`
  error naming `fetch-depth: 0`.
- [ ] Step 3: Verify pass.

## Task 9: Phase 1 — Comment upsert (`src/comment.ts`)

Files:
- Create: `src/comment.ts`, `test/comment.test.ts`

- [ ] Step 1: Failing tests (Octokit mocked): create-when-absent, update-when-
  marker-present, `comment:false` skip, empty-tree body, truncation, fork
  read-only 403 → warning + exit 0 (PRD FR-4.x / FR-5.3).
- [ ] Step 2: Verify failure; implement `composeBody` + marker `upsertComment()`
  via `@actions/github`; set `comment-url`.
- [ ] Step 3: Verify pass.

## Task 10: Phase 1 — Outputs gate, dist, release

Files:
- Modify: `action.yml` (→ node24), `src/index.ts`
- Create: `scripts/check-action-outputs.mjs`, `release-please-config.json`,
  `.release-please-manifest.json`, `.github/workflows/{ci,release,release-please}.yml`

- [ ] Step 1: Declare `tree`/`files-changed`/`comment-url` in `action.yml`; emit
  via `core.setOutput`; add the consistency script + a test (PRD FR-6.1 / §7.2).
- [ ] Step 2: `npm run build` → commit `dist/index.js`; CI runs `npm ci && npm
  test && npm run build && git diff --exit-code -- dist`.
- [ ] Step 3: Add `release-please`; release workflow verifies the bundle and moves
  the major `v1` tag (borrow contributors-please-action's release.yml).
- [ ] Step 4: Tag `v1.0.0`, move `v1`; submit to Marketplace (GOAL D7).
- [ ] Step 5: Point `difftree`'s own PR workflow at `smorinlabs/difftree-action@v1`
  (GOAL D8).

---

## Test & Release Gates (always-on)

- **Reproducible bundle (Phase 1):** `npm ci && npm run build` diffs `dist/`; any
  byte difference fails CI.
- **Outputs consistency:** `core.setOutput()` call sites ↔ `action.yml outputs:`;
  mismatch fails.
- **FR coverage:** every PRD §6 FR has ≥1 passing test row (GOAL §7.2).
- **E2E open→push→update:** scratch-repo workflow asserts the sticky behavior.

## Completion Audit

- [x] Phase 0 composite action posts a sticky diff-tree comment on a scratch PR
  (GOAL D3). **Validated 2026-06-29** against scratch repo
  `smorinlabs/difftree-action-test#1` (action ref `@feat/phase0-composite`):
  run `28403342440` created comment id `4837151013` with the diff-tree; a second
  push (run `28403478738`) updated the **same** comment in place (count stayed 1,
  body refreshed +16→+18). Both runs concluded `success`.
- [ ] `difftree` publishes cross-platform binary releases (GOAL D4).
- [ ] Phase 1 node24 action: reproducible `dist/`, outputs gate green,
  `release-please` wired, `v1` moving tag (GOAL D5).
- [ ] E2E workflow green against the scratch repo (GOAL D6).
- [ ] Marketplace listing live (GOAL D7); `difftree` consumes `@v1` (GOAL D8).
- [ ] Every §7.2 matrix row has a passing test.
