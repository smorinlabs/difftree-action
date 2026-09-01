# difftree-action

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/smorinlabs/difftree-action/actions/workflows/ci.yml/badge.svg)](https://github.com/smorinlabs/difftree-action/actions/workflows/ci.yml)

A GitHub Action that posts an **ASCII diff-tree** of a pull request's changes as a
single, self-updating PR comment — so reviewers can see the *shape* of a change
(which directories were touched, which files were added/modified/deleted) at a
glance. It's a thin wrapper over the
[`difftree`](https://github.com/smorinlabs/difftree) Rust CLI's `--pr` mode.

```text
🌳 difftree — changes in this PR

PR: origin/main...563a39c · committed
difftree-action
├── ● PROJECTS.md +6 −3
├── ● README.md +5 −5
├──   docs (3 files, +54 −10)
│   ├── ● RUNBOOK.md +4 −2
│   ├── ● rollout-findings.md +40 −0
│   └──   skills (1 files, +10 −8)
│       └── ● difftree-action-setup.md +10 −8
└──   examples (1 files, +3 −3)
    └── ↻ pr-diff-tree.yml -> difftree-pr-comment.yml +3 −3

4 dirs touched · 6 files changed (5 modified · 1 renamed) · +68 −28
```

By default the comment is rendered **in color** — status marks by git state,
`+N` green / `−M` red churn, and the summary line — using GitHub's inline-math
renderer, the same coloring `difftree` shows in a terminal. Set `color: "false"`
to get the plain code block above instead. See
[Color rendering — limits](#color-rendering--limits).

> **Status — Phase 0 (composite).** This release builds difftree from
> [crates.io](https://crates.io/crates/difftree) (`cargo install difftree@0.3.1`)
> at action time. A faster Phase 1 (a Node action that downloads a prebuilt
> binary) is planned once difftree ships binary releases. See
> [`PLAN.md`](./PLAN.md).

## Usage

```yaml
name: Difftree PR Comment
on:
  pull_request:
    types: [opened, reopened, synchronize, edited]
permissions:
  contents: read
  pull-requests: write        # required to post the comment
jobs:
  difftree-pr-comment:
    # `edited` re-renders only when the PR's base branch changed
    if: github.event.action != 'edited' || github.event.changes.base != null
    # Job-level, not workflow-level: a skipped no-op `edited` run must never
    # join this group, or it cancels a real render that is already running.
    # One run per PR so overlapping runs can't race to post the comment.
    concurrency:
      group: difftree-${{ github.event.pull_request.number }}
      cancel-in-progress: true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0      # REQUIRED — difftree --pr needs full base history
          persist-credentials: false
      - uses: smorinlabs/difftree-action@v0
        with:
          level: 3            # optional
```

> **Copy-paste ready:** the canonical version of this workflow is committed as
> [`examples/difftree-pr-comment.yml`](./examples/difftree-pr-comment.yml). Save it to
> `.github/workflows/difftree-pr-comment.yml` in your repo. `@v0` floats by default;
> SHA-pin the action (see the comment in that file) if your repo's policy requires it.

The action keeps a single sticky comment (hidden marker `<!-- difftree-action -->`).
If two runs ever race past the `concurrency` guard and create duplicates, the next
run self-heals: it keeps the oldest marker comment and deletes the extras.

### ⚠️ `fetch-depth: 0` is required

`difftree --pr` computes `merge-base(base, HEAD)` to find what the PR changed, and
difftree uses libgit2 (which handles shallow clones poorly). `actions/checkout`
defaults to a shallow `fetch-depth: 1`, which breaks this. **Set `fetch-depth: 0`.**
The action attempts a best-effort un-shallow as a fallback, but it is not
guaranteed; if the base history is missing the action fails with a clear message.

## Set it up with an agent

This repo ships the [`difftree-action-setup`](.claude/skills/difftree-action-setup/SKILL.md)
skill — auto-discovered by Claude Code (`.claude/skills/`) and Codex
(`.agents/skills/`) when working in this repo. Ask your agent to "set up difftree
PR comments" and it installs the difftree CLI (when needed) and scaffolds
[`examples/difftree-pr-comment.yml`](./examples/difftree-pr-comment.yml) into your repo. To
install the skill elsewhere, see
[`docs/skills/difftree-action-setup.md`](docs/skills/difftree-action-setup.md).

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `base-ref` | PR base (`pull_request.base.ref`) | Ref to diff against; compared as `origin/<base-ref>`. |
| `comment` | `true` | Post/update the PR comment. `false` computes outputs only. |
| `advertise` | `true` | Append a small "Get your own diff tree" attribution footer (`<sub>` line linking to this repo). `false` disables. |
| `color` | `true` | Render the comment in color via GitHub's inline-math renderer. `false` posts the plain code-fence comment. Only the posted comment is affected; the `tree` output is always plain. |
| `level` | _(unset)_ | Max tree depth (`difftree --level N`). |
| `dirs-only` | `false` | Show directories only (`difftree --dirs-only`). |
| `extra-args` | `''` | Extra args appended verbatim to the difftree call. |
| `difftree-version` | `0.3.1` | difftree crates.io version to install. |
| `github-token` | `${{ github.token }}` | Token used to post the comment. |

## Outputs

| Output | Description |
|--------|-------------|
| `tree` | The full rendered ASCII diff-tree text. |
| `files-changed` | Number of files changed between base and head. |
| `comment-url` | HTML URL of the created/updated comment (when posted). |

## How it works

On a `pull_request` event the action:

1. installs `difftree` from crates.io (the built binary is cached across runs
   with `actions/cache`);
2. resolves the base ref (default: the PR base) and ensures its history is present;
3. runs `difftree --pr=origin/<base> --committed --no-color`;
4. colors the plain text for GitHub (unless `color: "false"`) and upserts
   **one** sticky comment (hidden marker `<!-- difftree-action -->`), updating
   it in place on each push rather than stacking duplicates.

It authenticates with `GITHUB_TOKEN` only — it makes no repository writes other
than the PR comment.

### Color rendering — limits

Color is produced entirely in the comment step from difftree's plain
`--no-color` output: each line becomes one GitHub inline-math expression
(`` $`…`$ ``), so the CLI, its flags, and the `tree` output are unchanged.
GitHub's renderer imposes limits that were measured on 2026-09-01
(see `docs/superpowers/specs/2026-09-01-color-comment-design.md`):

- **~145 expressions per page**, shared by every comment on the PR. The action
  colors at most **100 lines** and puts the rest of a large tree in a plain code
  block under a one-line notice — still a single comment, with the summary line
  colored at the bottom. If other comments on the same PR carry a lot of math,
  the tail of the colored section can show raw TeX; set `color: "false"`.
- A filename containing a backtick cannot be encoded; that line and everything
  after it render plain.
- Color shows on github.com only. Email notifications (and some mobile views)
  show the TeX source, so teams that review by email should set `color: "false"`.

Writing your own colored trees or debugging a rendering problem? See the
"don't do this" guide [`docs/github-math-color-guide.md`](docs/github-math-color-guide.md)
and the copy-paste catalog [`examples/github-math-color-examples.md`](examples/github-math-color-examples.md).

### Fork pull requests

On PRs from forks, `GITHUB_TOKEN` is read-only, so the comment can't be posted.
The action logs a warning and exits successfully (it does not fail your check);
the tree is still available in the job log and the `tree` output.

## License

[MIT](./LICENSE)
