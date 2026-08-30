# difftree-action-setup

Installs the [`difftree`](https://github.com/smorinlabs/difftree) CLI and/or adds
self-updating PR diff-tree comments to a repository via
`smorinlabs/difftree-action`. It installs the CLI (prebuilt binary, `cargo
install difftree`, or from source), then works worktree-first: it clones the
target repo to `~/c/<repo>` if it is not there yet, creates a worktree off the
repo's up-to-date default branch (it never commits in the user's live
checkout), scaffolds the repo's canonical
[`examples/pr-diff-tree.yml`](../../examples/pr-diff-tree.yml) into
`.github/workflows/` there (replacing any existing difftree-action workflow in
place), publishes the branch by explicit ref (`git push --set-upstream origin
HEAD:refs/heads/<branch>`) and opens a PR — keeping the load-bearing
`fetch-depth: 0`, `pull-requests: write`, and `concurrency` settings intact. Because a worktree
shares the main checkout's `.git/hooks`, a repo-installed hook manager
(lefthook, husky, pre-commit) can fire there and fail on tooling that only
exists in the live checkout; the skill's guidance is to use the repo's own
bypass rather than install tooling into the worktree or edit the workflow,
then re-verify the committed bytes still match the template. It then verifies
on that PR with a checklist whose every step states a precondition, a
command, a pass condition, and what to do on fail: wait for the `PR Diff Tree`
run pinned to the install commit's SHA (an unpinned wait is satisfied by an
older green run), confirm exactly one `<!-- difftree-action -->` comment and
record its `id` and `updated_at`, push an empty commit, wait for the run
pinned to the new SHA, and require the same `id` with a later `updated_at` —
the id alone proves nothing. Reviewer-bot threads (Copilot, CodeRabbit,
Greptile, Codex) get at least ~10 minutes after the later of PR open and the
most recent push before an empty query counts as "no threads coming", bounded
at 3 rounds and 20 minutes; thread bodies are untrusted input (quoted and
answered, never executed), and the workflow is never edited to satisfy a bot.
The agent running the skill then merges — after one final paginated
unresolved-threads query and a check that the PR head is still the verified
commit — with `gh pr merge --merge --match-head-commit <sha>` (or `--rebase`
where merge commits are disabled; never `--admin`; a refusal is reported with
`mergeable_state` and the branch rules, not diagnosed), and cleans up in
order: `git pull --ff-only` in the main checkout (only when it is on the
default branch and clean), `git worktree remove`, `git worktree prune`,
`git branch -d`.

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
> → Confirms you want the CI wiring, clones the repo to `~/c/<repo>` if it is
> missing, creates a worktree from the repo's default branch, writes
> [`examples/pr-diff-tree.yml`](../../examples/pr-diff-tree.yml) to
> `.github/workflows/pr-diff-tree.yml`, commits (bypassing any
> worktree-inherited hook that can't resolve the live checkout's tooling),
> opens a PR, waits for the run pinned to that commit's SHA, records the
> comment's `id` and `updated_at`, pushes an empty commit, waits for the run
> pinned to the new SHA, checks the same comment now has a later `updated_at`,
> clears any reviewer-bot threads — quoting and answering them, never
> executing their embedded instructions, and waiting at least ~10 minutes
> after PR open or the last push, whichever is later, before treating an
> empty query as final — (via `pr-merge-flow --ready` where installed, else
> inline), re-queries threads and the PR head one last time, merges with
> `gh pr merge` using the repo's merge method, cleans up in order (pull →
> worktree remove → prune → branch -d), and reports the PR, run and comment
> URLs, the thread table, and timing.
