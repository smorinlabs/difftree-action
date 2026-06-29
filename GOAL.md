# GOAL — `difftree-action`: Ship a PR Diff-Tree Comment Action

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Author** | Steve Morin |
| **Last updated** | 2026-06-27 |
| **Companion PRD** | [`PRD.md`](./PRD.md) |
| **Engine** | [`smorinlabs/difftree`](https://github.com/smorinlabs/difftree) |
| **Pattern reference** | [`smorinlabs/contributors-please-action`](https://github.com/smorinlabs/contributors-please-action) |

---

## 1. Primary Goal

Ship `smorinlabs/difftree-action@v1`: a small GitHub Action that, on every pull
request, runs `difftree --pr` against the PR base and posts the resulting
**ASCII diff-tree** as a single self-updating PR comment — giving reviewers the
*shape* of a change at a glance without reading the full diff. The action is a
thin wrapper over the `difftree` Rust CLI, mirroring the engine→wrapper split of
`contributors-please` / `contributors-please-action`.

**Definition of "done":** a pull request in a consumer repository (starting with
`difftree`'s own repo) triggers `smorinlabs/difftree-action@v1`, which posts one
fenced-code-block comment containing the PR's diff-tree; subsequent pushes update
that same comment in place; the action authenticates with `GITHUB_TOKEN` alone
and requests only `pull-requests: write` + `contents: read`. The full functional
contract is [`PRD.md`](./PRD.md).

---

## 2. Working-Backwards Plan

Reverse-derivation chain from the desired end state:

1. **End state:** a consumer's `.github/workflows/*.yml` calls
   `smorinlabs/difftree-action@v1`; PRs get a sticky diff-tree comment.
2. **Therefore:** publish `smorinlabs/difftree-action@v1` (node24 action, the
   Phase 1 target — see PRD §8.2), with a committed, reproducible `dist/` and a
   moving major `v1` tag, on the GitHub Marketplace.
3. **Therefore:** the action must be able to obtain a `difftree` binary for the
   runner at action time → **`difftree` must publish prebuilt, cross-platform
   binary releases** (PRD §8.3). This is the one hard cross-repo prerequisite.
4. **Therefore (interim, removes the prerequisite):** ship a **Phase 0 composite
   action** (PRD §8.1) that builds `difftree` from source with `cargo` +
   `rust-cache` and posts the same comment — usable before any `difftree` release
   work exists.
5. **Therefore:** before either phase, produce a detailed implementation plan
   that maps each `difftree-action` component to its `contributors-please-action`
   analog and sequences the phased build with TDD — separate document,
   [`PLAN.md`](./PLAN.md) (Deliverable D2).
6. **Therefore:** before any code, the PRD's functional requirements (PRD §6) and
   the testing matrix (§7 below) are reviewed and accepted as the gate.

---

## 3. Repo Architecture

The structure mirrors the contributors-please pair, with one deliberate
difference: the engine is a **compiled Rust binary**, so it is *fetched or built*
by the action rather than bundled as a library dependency.

| Repository | Contents | Distribution |
|---|---|---|
| `smorinlabs/difftree` | The Rust CLI engine. Already exists; implements `--pr`, `--against`, `--range`, `--json`, status marks. Published as `0.3.0` on crates.io; needs prebuilt-binary releases for Phase 1. | crates.io (`difftree 0.3.0`, live); prebuilt GitHub Release binaries to be added. |
| `smorinlabs/difftree-action` | The GitHub Action wrapper: `action.yml`, comment upsert, base-ref/fetch handling. Phase 0 = composite; Phase 1 = node24 TS with committed `dist/`. | GitHub Action: `smorinlabs/difftree-action@v1` (Marketplace). |

Both checkouts exist locally at `/Users/stevemorin/c/difftree/` and
`/Users/stevemorin/c/difftree-action/`. The reference pair is at
`/Users/stevemorin/c/github-actions/contributors-please{,-action}/`.

The split is structural: GitHub Actions resolves `uses: <owner>/<repo>@<ref>` to
a repo root containing `action.yml`, which cannot also be the Rust crate root
without conflating two release lifecycles.

---

## 4. Success Criteria

The GOAL is "done" when **all** of the following hold:

1. A pull request in `smorinlabs/difftree` (dogfood consumer) triggers
   `smorinlabs/difftree-action@v1` and a comment appears containing a fenced
   ASCII diff-tree of the PR's changes plus a churn summary line.
2. A second push to the same PR **updates the existing comment in place** — there
   is never more than one `difftree-action` comment (marker
   `<!-- difftree-action -->`) per PR.
3. The diff-tree reflects `merge-base(base, HEAD)→HEAD` (PR-scoped changes), with
   the base resolved from `pull_request.base.ref` and passed explicitly as
   `origin/<base>`; the consumer checks out with `fetch-depth: 0` so the base
   history needed for `merge-base` is present (PRD FR-2.x).
4. The action runs with `permissions: { contents: read, pull-requests: write }`
   and `GITHUB_TOKEN` only — no GitHub App, no PAT.
5. With the `comment` input `false`, the action sets the `tree`, `files-changed`,
   and `comment-url` outputs and posts nothing (PRD FR-4.3 / §6.6).
6. On a fork PR (read-only token), the action does not fail the check: it logs a
   warning and still exposes the tree (PRD FR-5.3).
7. **Phase 1:** `dist/index.js` is reproducible — `npm ci && npm run build`
   yields a byte-identical `dist/`; CI fails on drift. A pinned `difftree`
   release binary is downloaded and run at action time.
8. **Phase 1 prerequisite:** `smorinlabs/difftree` exposes versioned,
   cross-platform binary releases the action consumes.
9. CI enforces `action.yml` `outputs:` ↔ `core.setOutput()` consistency (no
   undeclared outputs), mirroring the contributors-please discipline.
10. Every PRD §6 functional requirement has at least one passing automated test
    row in the matrix (§7.2).

---

## 5. Order of Operations

Each phase is gated on the prior phase being green in CI.

### P0 — Plan & test matrix reviewed (this document + `PLAN.md` + §7)
No coding begins until the PRD functional requirements and the §7 matrix are
accepted, and `PLAN.md` (D2) maps every component to a contributors-please-action
analog. Open items in §10 resolved or explicitly deferred.

### P1 — Phase 0 composite action (PRD §8.1)
Ship `using: composite`: Rust toolchain + `rust-cache` + `cargo install` a pinned
`difftree` + `git fetch` base + run `difftree --pr` + `actions/github-script`
sticky comment. TDD per §7. Tag `v0.x` for iteration. Dogfood on a `difftree` PR.

### P2 — difftree binary releases (cross-repo prerequisite for Phase 1)
Add a `difftree` release workflow producing cross-platform binaries (e.g.
`cargo-dist`) attached to `v*` releases. This is `difftree`-side work; it unblocks
Phase 1 but is not part of the action's own code.

### P3 — Phase 1 node24 action (PRD §8.2)
Rewrite as `using: node24, main: dist/index.js`: TypeScript wrapper downloads the
pinned `difftree` binary via `@actions/tool-cache`, runs it via `@actions/exec`,
upserts the comment via `@actions/github` + Octokit. Commit reproducible `dist/`.
Add `release-please`, the `v1` major-tag move, and the outputs-consistency check.

### P4 — Release & Marketplace
Tag `v1.0.0`, move `v1`, list `smorinlabs/difftree-action` on the Marketplace
(smorinlabs is a verified publisher). Point `difftree`'s own PR workflow at `@v1`.

---

## 6. Reference Analogy Map (contributors-please-action → difftree-action)

The implementation plan in [`PLAN.md`](./PLAN.md) expands this seed per-file.
Identifies where to *borrow* (same problem) and where to *diverge* (different
problem).

| contributors-please-action | difftree-action | Notes |
|---|---|---|
| Engine = `contributors-please` (npm library) | Engine = `difftree` (Rust binary) | **Same role, different distribution.** Library is `import`ed and bundled; binary is downloaded (Phase 1) or built (Phase 0). |
| `.contributors-please-engine-ref` (pins engine version) | `difftree-version` input + pinned default | Same purpose: pin which engine version the action runs. |
| `copy-library.mjs` bundles `dist/contributors-please-lib.js` | `@actions/tool-cache` download of the `difftree` binary | **Intentional divergence:** binaries cannot be ncc-bundled; they are fetched at action time and cached. |
| `src/index.ts` thin wrapper: parse inputs → construct engine → call → emit outputs | `src/index.ts` thin wrapper: resolve base/PR → fetch base → run `difftree` → upsert comment → emit outputs | Structurally identical wrapper pattern. |
| `maybeCommentOnPullRequest()` sticky comment via `<!-- contributors-please:check-comment -->` | sticky comment via `<!-- difftree-action -->` | Direct borrow of the marker-based upsert. |
| App/PAT token machinery (`app-token.ts`, identity lookup) | `GITHUB_TOKEN` only | **Intentional divergence:** the action only comments (read-only on the repo), so no write-capable identity is needed. |
| `action.yml` (node24, 21 inputs, 11 outputs) | `action.yml` (node24, ~7 inputs, 3 outputs) | Same shape, far smaller surface (PRD §7). |
| `check-action-outputs` consistency gate | same outputs-consistency gate | Direct borrow. |
| ncc `dist/index.js` committed + byte-reproducible CI check | same | Direct borrow. |
| `release-please` config + moving `v1` tag + Marketplace | same | Direct borrow. |
| `proxy.ts` (HTTPS_PROXY for API calls) | optional, only if download/API needs it | Borrow if needed; likely trivial for comment-only auth. |
| GitHub App provisioning (`contributors-please-bot`) | **none** | Dropped — no write identity needed. |

---

## 7. Testing & Verification Matrix

### 7.1 Test Layers

| Layer | Scope | Tooling | Runs |
|---|---|---|---|
| **Unit** | Pure functions: input parsing, difftree arg construction, comment body composition, marker find/upsert decision, truncation. | vitest | per-commit |
| **Integration** | `@actions/exec`/Octokit mocked: full wrapper path, base-ref resolution, fetch-base behavior, sticky create-vs-update, empty-tree body, fork-PR read-only warning. | vitest + mocked GitHub API + tmp-git-repo fixtures | per-commit |
| **E2E** | Real GitHub against a scratch repo: open a PR, assert one comment with a code block; push again, assert in-place update. | scheduled/manual GitHub Actions workflow | nightly / on tag |
| **Manual** | Dogfood on a real `difftree` PR; visual check of tree legibility in the rendered comment (finalizes OQ1 rendering flags). | documented runbook | pre-release |
| **Build** | `npm ci && npm run build` → byte-identical committed `dist/`; `action.yml` outputs ↔ `core.setOutput()` consistency. | CI | per-commit (Phase 1) |

### 7.2 Coverage Matrix by PRD Requirement

| PRD ref | Behavior | Unit | Integration | E2E |
|---|---|---|---|---|
| FR-1.1–1.3 | Event gating: act on `pull_request`, no-op + exit 0 otherwise; PR number/base/head from context | U-EVT-01..03 | I-EVT-01..02 | E-EVT-01 |
| FR-2.1–2.3 | Base ref default + `base-ref` override; explicit `--pr origin/<base>`; require `fetch-depth: 0` + best-effort unshallow; unresolvable merge-base → error | U-BASE-01..04 | I-BASE-01..03 | E-BASE-01 |
| FR-3.1–3.4 | difftree invocation: `--pr --committed --no-color`; `level`/`dirs-only`/`extra-args` pass-through; stdout/exit capture | U-INV-01..05 | I-INV-01..02 | covered by E-* |
| FR-4.1–4.5 | Comment body composition; sticky create vs update by marker; `comment:false` skip; empty-tree body; size truncation | U-CMT-01..06 | I-CMT-01..04 | E-CMT-01..02 (open→push→update) |
| FR-5.1–5.4 | Errors: binary missing, not-a-repo/bad-base, fork read-only warning (exit 0), `difftree-action:` prefix | U-ERR-01..04 | I-ERR-01..03 | E-ERR-01 (fork PR) |
| FR-6.1–6.2 | Outputs `tree`/`files-changed`/`comment-url`; `$GITHUB_STEP_SUMMARY` | U-OUT-01..03 | I-OUT-01 | E-OUT-01 |
| §8.2 / Build | Reproducible `dist/`; outputs-declaration consistency | — | (CI build-diff) | E-BLD-01 (per tag) |

### 7.3 Acceptance Test (final gate)

On a scratch repo (and then `difftree` itself):

1. Open a PR touching a few files across two directories.
2. **Expect:** one comment with marker `<!-- difftree-action -->` containing a
   fenced ASCII diff-tree and churn summary.
3. Push another commit. **Expect:** the same comment updates; no second comment.
4. Set `comment: false` in a variant run. **Expect:** outputs set, no comment.
5. Open the PR from a fork. **Expect:** check stays green; warning logged; no
   comment (or, if `pull_request_target` later adopted, a comment).

All five must pass for `v1` acceptance.

---

## 8. Deliverables Checklist

- [ ] **D1** — `PROMPT.md`, this `GOAL.md`, and `PRD.md` committed to the repo
  root.
- [ ] **D2** — `PLAN.md` produced, mapping every `difftree-action` component to
  its `contributors-please-action` analog and sequencing the phased TDD build.
- [ ] **D3** — Phase 0 composite action shipped; posts a sticky diff-tree comment
  on a scratch-repo PR and a `difftree` PR.
- [ ] **D4** — `smorinlabs/difftree` publishes cross-platform binary releases
  (Phase 1 prerequisite).
- [ ] **D5** — Phase 1 node24 action shipped; reproducible `dist/`; `release-please`;
  moving `v1` tag.
- [ ] **D6** — Scratch E2E workflow runs open→push→update against a test repo.
- [ ] **D7** — `smorinlabs/difftree-action` listed on the GitHub Marketplace.
- [ ] **D8** — `difftree`'s own PR workflow consumes `smorinlabs/difftree-action@v1`.

---

## 9. Out of Scope

- Rendering the full textual diff (GitHub already does this).
- Any repository write other than a PR comment (no commits, no PRs).
- Events other than `pull_request` in v1 (`push`, comment triggers, schedules).
- GitHub App / PAT auth and bot provisioning (not needed for comment-only).
- Re-implementing diff/tree logic in the action — all delegated to `difftree`.
- Owning `difftree`'s release pipeline (a prerequisite the action depends on, not
  action work).

## 10. Open Items

- OI1. ~~Phase 0 `difftree` pinning.~~ **Resolved (2026-06-29):** `difftree 0.3.0`
  (with `--pr`) is published on crates.io and tagged `v0.3.0`; Phase 0 pins to the
  crates.io version (`cargo install difftree@0.3.0`).
- OI2. Fork-PR support via `pull_request_target` — deferred to a post-v1 minor;
  decision recorded in PRD §9 / OQ3.
- OI3. Final rendering flags for comment legibility (PRD OQ1) — settled during
  Phase 0 manual verification.
- OI4. `difftree` is libgit2-backed (`git2` crate); confirm in Phase 0 how it
  behaves on shallow vs `fetch-depth: 0` checkouts and whether an in-action
  `git fetch --unshallow` rescues a forgotten `fetch-depth: 0` (PRD OQ4). This
  decides how hard the action fails on shallow checkouts.

New open questions surfacing during planning go in [`PLAN.md`](./PLAN.md), not
here.
