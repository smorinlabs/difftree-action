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

.
├── src
│   ├── index.ts        ●
│   └── comment.ts      ?
└── README.md           ○

2 dirs touched · 3 files changed · +40 −5
```

> **Status — Phase 0 (composite).** This release builds difftree from
> [crates.io](https://crates.io/crates/difftree) (`cargo install difftree@0.3.0`)
> at action time. A faster Phase 1 (a Node action that downloads a prebuilt
> binary) is planned once difftree ships binary releases. See
> [`PLAN.md`](./PLAN.md).

## Usage

```yaml
name: PR Diff Tree
on: pull_request
# Recommended: one run per PR so overlapping runs can't race to post the comment.
concurrency:
  group: difftree-${{ github.event.pull_request.number }}
  cancel-in-progress: true
permissions:
  contents: read
  pull-requests: write        # required to post the comment
jobs:
  difftree:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0      # REQUIRED — difftree --pr needs full base history
      - uses: smorinlabs/difftree-action@v0
        with:
          level: 3            # optional
```

> **Copy-paste ready:** the canonical version of this workflow is committed as
> [`examples/pr-diff-tree.yml`](./examples/pr-diff-tree.yml). Save it to
> `.github/workflows/pr-diff-tree.yml` in your repo.

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
[`examples/pr-diff-tree.yml`](./examples/pr-diff-tree.yml) into your repo. To
install the skill elsewhere, see
[`docs/skills/difftree-action-setup.md`](docs/skills/difftree-action-setup.md).

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `base-ref` | PR base (`pull_request.base.ref`) | Ref to diff against; compared as `origin/<base-ref>`. |
| `comment` | `true` | Post/update the PR comment. `false` computes outputs only. |
| `advertise` | `true` | Append a small "Get your own diff tree" attribution footer (`<sub>` line linking to this repo). `false` disables. |
| `level` | _(unset)_ | Max tree depth (`difftree --level N`). |
| `dirs-only` | `false` | Show directories only (`difftree --dirs-only`). |
| `extra-args` | `''` | Extra args appended verbatim to the difftree call. |
| `difftree-version` | `0.3.0` | difftree crates.io version to install. |
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
4. upserts **one** sticky comment (hidden marker `<!-- difftree-action -->`),
   updating it in place on each push rather than stacking duplicates.

It authenticates with `GITHUB_TOKEN` only — it makes no repository writes other
than the PR comment.

### Fork pull requests

On PRs from forks, `GITHUB_TOKEN` is read-only, so the comment can't be posted.
The action logs a warning and exits successfully (it does not fail your check);
the tree is still available in the job log and the `tree` output.

## License

[MIT](./LICENSE)
