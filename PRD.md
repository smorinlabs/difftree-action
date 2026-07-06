# PRD — `difftree-action`: PR Diff-Tree Comment Action

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Author** | Steve Morin |
| **Last updated** | 2026-06-27 |
| **Name** | `difftree-action` |
| **Engine** | [`smorinlabs/difftree`](https://github.com/smorinlabs/difftree) (Rust CLI) |
| **Companion GOAL** | [`GOAL.md`](./GOAL.md) |

---

## 1. Summary

`difftree-action` is a small GitHub Action that, on a pull request, renders an
**ASCII diff-tree** of the changes the PR introduces and posts it as a single,
self-updating PR comment. It is a thin wrapper over the
[`difftree`](https://github.com/smorinlabs/difftree) Rust CLI, whose `--pr` mode
already computes a merge-base→HEAD comparison and draws a git-aware tree. The
action's only jobs are: resolve the base ref, make sure the base history is
present, run `difftree --pr`, and upsert the rendered tree into a comment.

The intent is reviewer ergonomics: a reader opening the PR sees, at a glance, the
*shape* of the change — which directories were touched, which files were added,
modified, or deleted, and a one-line churn summary — without reading the full
diff.

The action follows the engine→wrapper split that
[`contributors-please`](https://github.com/smorinlabs/contributors-please) /
[`contributors-please-action`](https://github.com/smorinlabs/contributors-please-action)
established: the engine (`difftree`) is a separately-versioned tool, and the
action is a thin adapter to GitHub Actions inputs, outputs, and the PR comment
API. Because `difftree` is a compiled Rust binary rather than an npm library, it
cannot be bundled into the action the way the contributors-please engine is;
"how the action obtains the binary" is therefore the defining mechanical
decision and is handled in two phases (§8).

---

## 2. Background & Motivation

GitHub's native PR view shows a flat file list and a unified/split diff. For
large or structurally significant changes, neither conveys the *topology* of the
change quickly: which subtrees moved, how deep the change reaches, how many files
in each area. `difftree --pr` answers exactly that, but only for someone who has
the CLI installed and runs it locally against the right base.

`difftree-action` removes that friction: the tree is computed in CI and surfaced
inline on every push to the PR. No reviewer setup, no local checkout.

The guiding analogy throughout: **`difftree` is to `difftree-action` what
`contributors-please` (the engine) is to `contributors-please-action` (the
wrapper)** — a versioned tool wrapped by a thin, GitHub-Actions-specific adapter.
The one structural difference is distribution: a Rust binary is fetched or built,
not `import`ed.

---

## 3. Goals / Non-Goals

### Goals

- G1. On a pull request, post a comment containing the ASCII diff-tree of the
  PR's changes (base→head), inside a fenced code block.
- G2. Keep exactly **one** such comment per PR, updated in place on each push
  (sticky comment), never stacking duplicates.
- G3. Stay genuinely simple: a minimal input surface plus a few curated
  pass-through flags (§7.1), and `GITHUB_TOKEN`-only auth — no GitHub App / PAT
  machinery.
- G4. Be correct about the two CI traps that silently break a PR diff: shallow
  checkout (missing base history) and base-ref auto-detection (§6.2).
- G5. Mirror the conventions of `contributors-please-action` where they apply:
  node24 TypeScript action, committed `dist/`, `release-please`, declared
  outputs, vitest.
- G6. Ship something usable *before* `difftree` has binary releases (Phase 0),
  then converge on the fast, thin target once it does (Phase 1).

### Non-Goals

- N1. Rendering the full textual diff (GitHub already does this). The action
  shows structure, not line-level content.
- N2. Committing files, opening PRs, or any write to the repository other than a
  PR comment. (This is why `GITHUB_TOKEN` suffices and no App/PAT is needed.)
- N3. Supporting arbitrary events beyond pull requests in v1. `push`, comment
  triggers, and scheduled runs are out of scope (§11 lists possible futures).
- N4. Re-implementing any diff logic in the action. All comparison and rendering
  is delegated to `difftree`; the action never parses or transforms the tree.
- N5. Publishing or maintaining `difftree`'s release pipeline. The action
  *depends on* `difftree` releases (a documented prerequisite, §8.3); producing
  them is `difftree`-side work tracked in [`GOAL.md`](./GOAL.md), not here.

---

## 4. Target Users & Use Cases

**Primary user:** a maintainer who wants reviewers to grasp the scope of a PR at
a glance, with zero per-reviewer setup.

- UC1. A contributor opens a PR; the action posts a diff-tree comment showing the
  touched subtrees and a churn summary.
- UC2. The contributor pushes more commits; the existing comment updates in place
  rather than a new one appearing.
- UC3. A maintainer dogfoods the action on the `difftree` repo itself, so every
  `difftree` PR carries its own diff-tree.
- UC4. A maintainer tunes depth (`level`) or restricts to directories
  (`dirs-only`) for very large PRs to keep the comment readable.

---

## 5. Key Concepts & Terminology

- **Diff-tree** — the ASCII/Unicode tree `difftree` renders for a comparison,
  with per-node git status marks and an optional churn summary line.
- **`--pr` mode** — `difftree`'s PR-style comparison: it resolves a base, computes
  `merge-base(base, HEAD)`, and shows what changed from there to `HEAD`. Base is
  auto-detected (`origin/HEAD` → `main` → `master`) unless an explicit ref is
  passed. The explicit base **must use the `=` form** — `difftree --pr=<ref>` (or
  the separate `difftree --pr --pr-base <ref>`). The space form `--pr <ref>` is
  parsed as the positional path and fails; the action uses `--pr=origin/<base>`.
- **`--committed`** — restricts `--pr` to committed branch commits
  (merge-base→HEAD), excluding any working-tree state. The action uses it for
  determinism (the CI checkout has no relevant working-tree changes).
- **Sticky comment** — a PR comment the action owns, identified by a hidden HTML
  marker (`<!-- difftree-action -->`) so it can find and update its prior comment
  instead of creating a new one.
- **Phase 0 / Phase 1** — the two delivery stages for obtaining the `difftree`
  binary: build-from-source composite action (Phase 0) and downloaded-prebuilt
  node24 action (Phase 1). See §8.

---

## 6. Functional Requirements

### 6.1 Trigger & Event Handling

- FR-1.1 The action is designed for the `pull_request` event. On any other event
  (or when no PR number is resolvable from the event payload) it does nothing and
  exits 0 with an explanatory log line.
- FR-1.2 The PR number, base ref, and head ref are read from the event context
  (`github.event.pull_request.{number,base.ref,head.ref}`), with the GitHub
  Actions runtime env (`GITHUB_EVENT_PATH`, `GITHUB_REPOSITORY`) as the source of
  truth, mirroring `contributors-please-action`'s event handling.
- FR-1.3 The action does **not** require `pull_request_target`. The fork-PR
  consequence of this choice is specified in FR-9.x and §9.

### 6.2 Base Ref Resolution & History Availability

- FR-2.1 The base ref defaults to the PR base branch
  (`github.event.pull_request.base.ref`) and is passed **explicitly** as the
  remote-tracking ref `origin/<base>` to `difftree --pr=origin/<base>`. The CI
  checkout is a detached HEAD with no local `main` branch, so the remote-tracking
  form is what resolves; bare `<base>` may not. The action does not rely on
  `difftree`'s `origin/HEAD → main → master` auto-detection, which is unreliable
  in a CI checkout.
- FR-2.2 The `base-ref` input overrides the resolved base when set (§7.1).
- FR-2.3 `difftree --pr` needs the base commit's full history to the branch point
  to compute `merge-base(base, HEAD)`. The **supported, recommended** consumer
  configuration is therefore `actions/checkout` with **`fetch-depth: 0`** (full
  history) — this is documented as a requirement in the README and workflow
  example, not an optional nicety. Two reasons it is not optional: (a) on a
  non-merge-ref checkout the branch point can be arbitrarily far back, which a
  shallow fetch will not contain; and (b) `difftree` is **libgit2-backed**
  (`git2` crate), and libgit2 has poor shallow-repository support, so operating
  against a shallow checkout can fail outright regardless of any fetch. As a
  best-effort convenience the action additionally attempts a deepening fetch of
  the base ref (`git fetch --deepen` / unshallow `origin <base>`) when it detects
  a shallow checkout, but if `merge-base` still cannot be resolved it fails with a
  clear error pointing the consumer at `fetch-depth: 0` — never a silent empty
  tree (FR-5.x).

### 6.3 difftree Invocation

- FR-3.1 The action invokes `difftree --pr=origin/<base> --committed` with color
  disabled (`--no-color`) so the output is clean ASCII suitable for a markdown
  code block.
- FR-3.2 Curated pass-through flags are appended when their inputs are set:
  `level` → `--level N`, `dirs-only` → `--dirs-only`, and a small free-form
  `extra-args` escape hatch (§7.1).
- FR-3.3 The action captures `difftree`'s stdout verbatim as the tree text and
  its exit code. A non-zero exit is surfaced (FR-5.x), not swallowed.
- FR-3.4 The exact rendering flags (`--format`, `--marks`) are finalized during
  implementation by visual verification against a GitHub comment; `--no-color` is
  non-negotiable, the rest are tunable defaults.

### 6.4 Comment Rendering & Upsert

- FR-4.1 The comment body is composed of: the hidden marker
  `<!-- difftree-action -->`, a heading, and a fenced code block containing the
  captured tree text.
- FR-4.2 The action finds its prior comment on the PR by the marker and
  **updates it in place**; if none exists it creates one. There is at most one
  difftree-action comment per PR (sticky pattern, as in
  `contributors-please-action`).
- FR-4.3 When the `comment` input is `false`, the action computes the tree and
  sets outputs but posts/updates nothing.
- FR-4.4 When the tree is empty (no changes between base and head), the action
  posts a short "no file changes" body rather than an empty code block.
- FR-4.5 An over-long tree is truncated to stay within GitHub's comment size
  limit, with a trailing notice; the `tree` output (FR-6.x) always carries the
  full text.
- FR-4.6 The comment ends with a small self-attribution footer — a `<sub>` line
  reading "🌳 Get your own diff tree at …" linking to this repository — unless
  the `advertise` input is `"false"` (default `"true"`). Both `<sub>` and the
  `<a href>` survive GitHub's comment sanitizer (verified against the rendered
  `body_html`). The footer appears on empty-diff comments too.

### 6.5 Error Handling & Edge Cases

- FR-5.1 `difftree` binary missing/unrunnable → the action fails with a message
  naming the resolution path (Phase 0: build step failed; Phase 1: download/tool
  -cache failed).
- FR-5.2 Not a git repository, bare repo, or unresolvable base → the action
  surfaces `difftree`'s stderr message and fails; it never posts a misleading
  empty tree.
- FR-5.3 Comment API failure (e.g. read-only token on a fork PR) → the action
  logs a warning and exits 0 (the tree is still available as an output and in the
  job log), rather than failing the whole check. This is the deliberate fork-PR
  behavior (§9).
- FR-5.4 All failure messages are prefixed `difftree-action:` for greppability.

### 6.6 Outputs & Observability

- FR-6.1 Declared outputs (mirroring `contributors-please-action`'s
  "declare every output in `action.yml`" discipline, enforced in CI):
  - `tree` — the full rendered ASCII tree text.
  - `files-changed` — count of changed files (parsed from `difftree`'s summary or
    `--json`).
  - `comment-url` — HTML URL of the created/updated comment, when one was posted.
- FR-6.2 The action writes a concise run summary to `$GITHUB_STEP_SUMMARY`
  (base ref used, files changed, whether a comment was posted).

---

## 7. Configuration

### 7.1 Action Inputs (flat, all optional)

| Input | Default | Purpose |
|---|---|---|
| `base-ref` | PR base (`pull_request.base.ref`) | Override the comparison base. |
| `comment` | `true` | Post/update the PR comment. `false` computes outputs only. |
| `advertise` | `true` | Append a small "Get your own diff tree" attribution footer (`<sub>` line linking to this repo). `false` disables. |
| `level` | (unset) | Max tree depth → `difftree --level N`. |
| `dirs-only` | `false` | Directories only → `difftree --dirs-only`. |
| `extra-args` | `''` | Small escape hatch appended verbatim to the difftree call. |
| `difftree-version` | pinned default | Which `difftree` release/tag the action uses (Phase 1) or builds (Phase 0). |
| `github-token` | `${{ github.token }}` | Token used to post the comment. |

Hardcoded internally (not inputs): `--pr=origin/<base>`, `--committed`,
`--no-color`.

### 7.2 Action Outputs

As declared in FR-6.1: `tree`, `files-changed`, `comment-url`. CI greps
`core.setOutput()` call sites and diffs them against `action.yml` `outputs:` to
prevent drift, exactly as the contributors-please pair does.

### 7.3 Consumer Workflow Example (target shape)

```yaml
name: PR Diff Tree
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  difftree:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # REQUIRED: difftree --pr needs full base history
      - uses: smorinlabs/difftree-action@v1
        with:
          level: 3                # optional
```

---

## 8. Architecture & Mechanics

### 8.1 Phase 0 — Composite action (ships without changing difftree)

`runs: using: composite`. Steps: restore a build cache (`Swatinem/rust-cache`),
`cargo install difftree@<version>` from **crates.io** (default `0.3.0`; rustup is
preinstalled on GitHub-hosted runners), ensure base history (`git fetch`), run
`difftree --pr`, then post the sticky comment via a small `actions/github-script`
step using `github.token`. This works today — `difftree 0.3.0` (with `--pr`) is
published on crates.io. Cold-cache runs pay a Rust compile (~1–3 min), warm-cache
runs are fast.

### 8.2 Phase 1 — node24 action (the target, mirrors contributors-please-action)

`runs: using: node24, main: dist/index.js`. A TypeScript entrypoint:

1. resolves base ref + PR number from the Actions context (`@actions/github`);
2. ensures base history (`@actions/exec` → `git fetch`);
3. downloads the prebuilt `difftree` binary for the runner OS/arch from a
   `difftree` GitHub Release via `@actions/tool-cache`, caching it;
4. runs `difftree --pr …` via `@actions/exec`, capturing stdout;
5. upserts the sticky comment via Octokit (`@actions/github`);
6. sets outputs and the step summary.

`dist/index.js` is ncc-bundled and committed; CI verifies it is byte-identical to
a fresh build, identical to the contributors-please-action discipline.

### 8.3 Prerequisite for Phase 1: difftree binary releases

Phase 1 requires `difftree` to publish **prebuilt, cross-platform binaries**
(linux/macos/windows × x86_64/arm64) attached to versioned GitHub Releases —
e.g. via `cargo-dist` or a release workflow. As of 2026-06-29 `difftree` **is**
published to crates.io (`0.3.0`, with `--pr`) and has tag `v0.3.0`, but has **no
prebuilt-binary GitHub Release assets** yet — that is the remaining hard gate on
Phase 1. It is `difftree`-side work, tracked as a "Therefore" step in
[`GOAL.md`](./GOAL.md). Phase 0 installs from crates.io (`cargo install
difftree@0.3.0`) and so does not need the binaries.

### 8.4 Version pinning

The `difftree-version` input (default `0.3.0`, pinned in the action) selects which
`difftree` crates.io version the action installs, analogous to
`contributors-please-action`'s `.contributors-please-engine-ref`. The default is
bumped via PR when a new `difftree` release is adopted.

---

## 9. Permissions & Security

- The action needs only `pull-requests: write` (to comment) and `contents: read`
  (to read the tree / fetch base history). It authenticates with the workflow's
  `GITHUB_TOKEN`; no GitHub App or PAT is involved, because the action performs
  no repository writes (contrast with contributors-please, which commits and
  therefore needs an App/PAT to trigger downstream workflows).
- **Fork PRs.** With the plain `pull_request` event, PRs from forks receive a
  read-only `GITHUB_TOKEN`, so the comment POST will fail. The action treats this
  as a non-fatal warning (FR-5.3): the tree is still produced and logged, but no
  comment is posted. Opting into `pull_request_target` would allow commenting on
  fork PRs and is comparatively low-risk here (the action only *reads* the repo
  tree and never executes checked-out code), but it is **out of scope for v1**
  and called out as an explicit, opt-in future decision (§11).
- The action never logs the token and never echoes `extra-args` into a context
  where it could be interpreted as a secret.

## 10. Edge Cases & Failure Modes

- **Shallow checkout** (`fetch-depth: 1`, the `actions/checkout` default) → base
  merge-base unavailable, and libgit2 may reject the shallow repo outright. The
  required fix is consumer-side `fetch-depth: 0` (FR-2.3); the action's
  best-effort deepening fetch is a convenience, not a guarantee, and a still-
  unresolvable merge-base fails with a message naming `fetch-depth: 0`.
- **PR head == base** (e.g. action mis-triggered on the base branch) → `difftree`
  emits its "on base branch" notice; the action posts the resulting (typically
  empty) tree per FR-4.4.
- **Binary unavailable for runner arch** (Phase 1) → fail with a clear message
  naming the missing asset; consumer can fall back to Phase 0 or a different
  runner.
- **Comment exceeds size limit** → truncate with a notice (FR-4.5).
- **No changes** → "no file changes" comment (FR-4.4).

## 11. Milestones & Future Enhancements

- **M0 (Phase 0):** Composite action posts a sticky diff-tree comment on a PR in
  a scratch repo and on `difftree`'s own PRs. No `difftree` release changes.
- **M1 (difftree prerequisite):** `difftree` ships versioned, cross-platform
  binary releases.
- **M2 (Phase 1):** node24 action downloads the binary and posts the comment;
  `dist/` committed and reproducible; `release-please` + `v1` major tag;
  Marketplace listing.
- **Future (out of v1 scope):** `pull_request_target` opt-in for fork PRs;
  `push`/commit-status surfaces; multiple comparison modes; `--json`-driven
  richer summaries; configurable comment heading/template.

## 12. Open Questions

- OQ1. Exact `difftree` rendering flags for best GitHub-comment legibility
  (`--format`, `--marks`) — resolved by visual verification in implementation.
- OQ2. ~~Whether Phase 0 should pin `difftree` by git tag or commit rev.~~
  **Resolved (2026-06-29):** `difftree 0.3.0` is on crates.io, so Phase 0 pins to
  the crates.io version (`cargo install difftree@0.3.0`).
- OQ3. Whether to adopt `pull_request_target` for fork support in a later minor,
  given the read-only nature of the action.
- OQ4. `difftree` is `git2`/libgit2-backed; confirm during Phase 0 exactly how it
  behaves against a shallow checkout and a `fetch-depth: 0` checkout in CI, and
  whether a `git fetch --unshallow` in the action is sufficient when a consumer
  forgets `fetch-depth: 0`, or whether shallow must be treated as a hard failure.
