# PROMPT — Build `difftree-action`

> Hand this prompt to the goal/planning flow. It is the entry point; it points at
> [`GOAL.md`](./GOAL.md) for the working-backwards plan and [`PRD.md`](./PRD.md)
> for the requirements, with [`PLAN.md`](./PLAN.md) as the implementation plan.

---

## The ask

Create **`smorinlabs/difftree-action`**, a small, public GitHub Action that runs
on pull requests and posts an **ASCII diff-tree** of the PR's changes as a single,
self-updating PR comment (a quoted/fenced code block). It is a thin wrapper over
the [`smorinlabs/difftree`](https://github.com/smorinlabs/difftree) Rust CLI,
whose `--pr` mode already computes a merge-base→HEAD, git-aware tree. Model the
repo's structure and conventions on
[`smorinlabs/contributors-please-action`](https://github.com/smorinlabs/contributors-please-action)
(engine→wrapper split, node24 TypeScript, committed `dist/`, `release-please`,
declared outputs, sticky PR comment).

## Goal of the goal

The goal is to **create this new project**: a working `difftree-action` a
maintainer can drop into a workflow so that every PR carries a diff-tree comment
showing the *shape* of the change — which directories were touched and which
files were added/modified/deleted — with zero per-reviewer setup, the right
permissions, and proper error handling around the rendered code block.

## What "good" looks like

- On a `pull_request`, the action runs `difftree --pr=origin/<base> --committed
  --no-color` and posts the captured tree in a fenced code block.
- The comment is **sticky**: one comment per PR (hidden marker
  `<!-- difftree-action -->`), updated in place on each push — never duplicated.
- Auth is **`GITHUB_TOKEN` only**; permissions are `contents: read` +
  `pull-requests: write`. No GitHub App, no PAT (the action only comments).
- It is correct about the two CI traps: it passes the base ref **explicitly** as
  `origin/<base>` (from `pull_request.base.ref`) and requires the consumer to
  checkout with **`fetch-depth: 0`** so `merge-base` has the base history — the
  default shallow checkout breaks `--pr`, and difftree is libgit2-backed so
  shallow repos are unreliable regardless.
- The input surface is deliberately small (≈ `base-ref`, `comment`, `level`,
  `dirs-only`, `extra-args`, `difftree-version`, `github-token`) — far smaller
  than contributors-please-action's 21 inputs.

## How to build it (two phases)

Because `difftree` is a compiled Rust binary with **no published releases yet**,
"how the action obtains the binary" is the defining decision. Build in two phases:

1. **Phase 0 — composite action (ships now):** `using: composite`; install
   `difftree` from crates.io (`cargo install difftree@0.3.0`, with
   `Swatinem/rust-cache`), fetch the base, run it, post the comment via
   `actions/github-script`. No `difftree` changes required — `0.3.0` (with `--pr`)
   is already on crates.io.
2. **Phase 1 — node24 action (the target):** TypeScript wrapper that downloads a
   prebuilt `difftree` binary via `@actions/tool-cache`, runs it via
   `@actions/exec`, and posts the comment via `@actions/github`. **Prerequisite:**
   `difftree` must first publish cross-platform binary releases — `difftree`-side
   work, listed as a "Therefore" step in `GOAL.md`, not part of this action's code.

## Deliverables already produced (this planning pass)

- [`PROMPT.md`](./PROMPT.md) — this prompt.
- [`GOAL.md`](./GOAL.md) — working-backwards goal, success criteria, order of
  operations, contributors-please-action analogy map, test matrix, deliverables.
- [`PRD.md`](./PRD.md) — summary, goals/non-goals, functional requirements,
  configuration (inputs/outputs), phased architecture, permissions/security,
  edge cases, milestones.
- [`PLAN.md`](./PLAN.md) — evidence baseline, component analogy map, file layout,
  phased TDD task breakdown, test/release gates, completion audit.

## Your job from here

Read `GOAL.md` and `PRD.md`, then **execute `PLAN.md`** with TDD (tests first):
start with Phase 0 Tasks 1–4 to ship a usable composite action, then unblock and
build Phase 1. Honor the constraints above — sticky comment, `GITHUB_TOKEN`-only,
explicit base ref, base-history fetch, minimal inputs, declared outputs,
reproducible `dist/`. Keep it simple: all diff/tree logic stays in `difftree`;
the action only adapts it to GitHub Actions and the PR comment API.
