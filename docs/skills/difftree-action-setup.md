# difftree-action-setup

Installs the [`difftree`](https://github.com/smorinlabs/difftree) CLI and/or adds
self-updating PR diff-tree comments to a repository via
`smorinlabs/difftree-action`. It installs the CLI (prebuilt binary, `cargo
install difftree`, or from source), then scaffolds the repo's canonical
[`examples/pr-diff-tree.yml`](../../examples/pr-diff-tree.yml) into a target
repository's `.github/workflows/` and opens a PR — keeping the load-bearing
`fetch-depth: 0`, `pull-requests: write`, and `concurrency` settings intact.

**Triggers on:** "install difftree", "set up difftree", "add difftree to my
repo", "add PR diff-tree comments", "set up difftree-action".
**Arguments:** none (interactive — it confirms CLI install, repo wiring, or both).

## Install

**In this repo — nothing to install.** Claude Code auto-discovers
`.claude/skills/difftree-action-setup/`; Codex discovers it through the committed
symlink `.agents/skills/difftree-action-setup`.

**Copy into your own setup** (no dependencies):

    git clone https://github.com/smorinlabs/difftree-action
    cp -R difftree-action/.claude/skills/difftree-action-setup ~/.claude/skills/difftree-action-setup   # Claude Code
    cp -R difftree-action/.claude/skills/difftree-action-setup ~/.agents/skills/difftree-action-setup   # Codex

**Dev mode** (edits in the clone are live next session):

    ln -s "$(pwd)/difftree-action/.claude/skills/difftree-action-setup" ~/.claude/skills/difftree-action-setup   # Claude Code
    ln -s "$(pwd)/difftree-action/.claude/skills/difftree-action-setup" ~/.agents/skills/difftree-action-setup   # Codex

> Copied out of this repo, the skill can no longer read
> `examples/pr-diff-tree.yml` by relative path; it falls back to fetching the
> canonical file from
> `https://raw.githubusercontent.com/smorinlabs/difftree-action/v0/examples/pr-diff-tree.yml`.

## Example session

> Set up difftree PR comments on this repo.
> → Confirms you want the CI wiring, writes
> [`examples/pr-diff-tree.yml`](../../examples/pr-diff-tree.yml) to
> `.github/workflows/pr-diff-tree.yml`, branches, commits, and opens a PR.
