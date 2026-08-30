# difftree-action-setup

Installs the [`difftree`](https://github.com/smorinlabs/difftree) CLI and/or adds
self-updating PR diff-tree comments to a repository via
`smorinlabs/difftree-action`. It installs the CLI (prebuilt binary, `cargo
install difftree`, or from source), then creates a worktree off the target
repo's up-to-date default branch (it never commits in the user's live
checkout) and scaffolds the repo's canonical
[`examples/pr-diff-tree.yml`](../../examples/pr-diff-tree.yml) into
`.github/workflows/` there (replacing any existing difftree-action workflow in
place) and opens a PR — keeping the load-bearing `fetch-depth: 0`,
`pull-requests: write`, and `concurrency` settings intact. Because a worktree
shares the main checkout's `.git/hooks`, a repo-installed hook manager
(lefthook, husky, pre-commit) can fire there and fail on tooling that only
exists in the live checkout; the skill's guidance is to use the repo's own
bypass rather than install tooling into the worktree or edit the workflow,
then re-verify the committed bytes still match the template. It then verifies
on that PR: the `PR Diff Tree` run is green, the `<!-- difftree-action -->`
comment posted, and a second push updates the same comment — proved by the
comment's `updated_at` moving forward, not just by its id staying the same —
before merging. Reviewer-bot threads (Copilot, CodeRabbit, Greptile, Codex,
…) are given at least ~10 minutes after the PR opened *or* after the most
recent push, whichever is later, before an empty query is treated as "no
threads coming" — the loop is bounded at 3 rounds and 20 minutes total.

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

> The skill finds the template by walking up from its own physical directory
> (symlinks resolved) to a directory holding both `action.yml` and
> `examples/pr-diff-tree.yml`, so every placement above works. Copied out of
> this repo, nothing is found and it fetches the canonical file from
> `https://raw.githubusercontent.com/smorinlabs/difftree-action/main/examples/pr-diff-tree.yml`.

## Example session

> Set up difftree PR comments on this repo.
> → Confirms you want the CI wiring, creates a worktree from the repo's
> default branch, writes
> [`examples/pr-diff-tree.yml`](../../examples/pr-diff-tree.yml) to
> `.github/workflows/pr-diff-tree.yml`, branches, commits (bypassing any
> worktree-inherited hook that can't resolve the live checkout's tooling),
> opens a PR, waits for the run, checks the comment posted and self-updates
> (same id, later `updated_at`), clears any reviewer-bot threads — waiting at
> least ~10 minutes after PR open or the last push, whichever is later,
> before treating an empty query as final — (via `pr-merge-flow` where
> installed, else inline), then merges.
