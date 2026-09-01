# difftree-pr-body

Maintains a foldable "🌳 Diff tree" section in a PR **body**, rendered by the
agent from the [`difftree`](https://github.com/smorinlabs/difftree) CLI and
spliced between `<!-- difftree-pr-body:begin -->` / `<!-- difftree-pr-body:end -->`
markers at the bottom of the description. It is the agent-driven alternative to
the difftree-action PR *comment*: no GitHub Action runs and no extra comment is
posted, which suits repos where every PR body edit already goes through an
agent that re-syncs the description after pushes. The trade-off is freshness —
the section only updates when the agent edits the body, so pushes that bypass
the agent (manual pushes, other collaborators, GitHub-UI "update branch") leave
it stale until the next agent pass; prefer the difftree-action comment when
those happen.

The skill renders with `difftree --pr=origin/<base> --committed --no-color`
(after fetching the base — full history required), uses the output's last line
as the fold's `<summary>` stats line, strips any existing marker section, and
appends the fresh one via `gh pr edit --body-file`. Its staleness criterion is
byte-identity: a fresh render must match the tree inside the section on GitHub.

**Triggers on:** authoring a PR body, updating a PR description after pushes,
"add a diff tree to the PR body", "refresh the diff tree".
**Arguments:** none.
**Requires:** the difftree CLI on PATH (`difftree-action-setup` §1 installs
it: prebuilt binary, `cargo install difftree`, or this repo's flox env).

## Install

**In this repo — nothing to install.** Claude Code auto-discovers
`.claude/skills/difftree-pr-body/`; Codex discovers it through the committed
symlink `.agents/skills/difftree-pr-body`.

**Copy into your own setup** (no dependencies):

    git clone https://github.com/smorinlabs/difftree-action
    cp -R difftree-action/.claude/skills/difftree-pr-body ~/.claude/skills/difftree-pr-body   # Claude Code
    cp -R difftree-action/.claude/skills/difftree-pr-body ~/.agents/skills/difftree-pr-body   # Codex

**Dev mode** (edits in the clone are live next session):

    ln -s "$(pwd)/difftree-action/.claude/skills/difftree-pr-body" ~/.claude/skills/difftree-pr-body   # Claude Code
    ln -s "$(pwd)/difftree-action/.claude/skills/difftree-pr-body" ~/.agents/skills/difftree-pr-body   # Codex

## Example session

> Open a draft PR for this branch.
> → The agent authors the body (summary first, reviewer detail in `<details>`
> blocks), renders `difftree --pr=origin/main --committed --no-color`, appends
> the marker-delimited fold whose `<summary>` is the stats line, and opens the
> PR. After each later push, its "does the description still match the diff"
> pass re-renders the tree and splices the section fresh.
