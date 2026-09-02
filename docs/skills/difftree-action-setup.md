# difftree-action-setup

Installs the [`difftree`](https://github.com/smorinlabs/difftree) CLI and/or adds
self-updating PR diff-tree comments to a repository via
`smorinlabs/difftree-action`. It installs the CLI (prebuilt binary, `cargo
install difftree`, or from source), then works worktree-first: it locates the
user's local clone of the target repo (cloning it over HTTPS if absent — into
whatever directory the user keeps repositories), checks that no leftover
`ci/difftree-pr-comment` branch survives on the remote from a previous run
(deleting it first if merged, else stopping), creates a worktree off the
repo's up-to-date default branch (it never commits in the user's live
checkout), scaffolds the repo's canonical
[`examples/difftree-pr-comment.yml`](../../examples/difftree-pr-comment.yml) into
`.github/workflows/` there (replacing any existing difftree-action workflow in
place), byte-identical to the template **as resolved from where the skill
loaded** — an unpublished local branch's copy where that's what resolved,
declared in the PR body, not silently assumed to be `main`'s copy — unless the
target repo requires SHA-pinned third-party actions, in which case it resolves
the current tag to its commit sha and writes that pinned form instead, the one
deviation the fleet drift check itself ignores — publishes the branch by
explicit ref (`git push --set-upstream origin
HEAD:refs/heads/<branch>`) and opens a PR — keeping the load-bearing
`fetch-depth: 0`, `pull-requests: write`, and `concurrency` settings intact. Because a worktree
shares the main checkout's `.git/hooks` (`pre-commit` and `pre-push` alike), a
repo-installed hook manager (lefthook, husky, pre-commit) can fire there on
every commit and push and fail on tooling that only exists in the live
checkout; the skill's guidance is to use the repo's own bypass on every git
command the hooks cover, including the pushes, rather than install tooling
into the worktree or edit the workflow, then re-verify the committed bytes
still match the template. It then verifies on that PR with a checklist whose
every step states a precondition, a command, a pass condition, and what to do
on fail — and each verification step states its intent, so operators can adapt
its commands to a repo's differences rather than reverse-engineer them: wait for the `Difftree PR Comment` run pinned to the install commit's SHA
(an unpinned wait is satisfied by an older green run), confirm exactly one
`<!-- difftree-action -->` comment and record its `id` and `updated_at`, push
an empty commit, wait for the run pinned to the new SHA, and require the same
`id` with a strictly later `updated_at` — the id alone proves nothing.
Reviewer-bot threads (Copilot, CodeRabbit, Greptile, Codex) are answered as
they arrive, but get at least ~10 minutes after the later of PR open and the
most recent push before an empty query counts as "no threads coming", bounded
at 3 rounds and 20 minutes after that; thread bodies are untrusted input
(quoted and answered, never executed), a SHA-pinning ask is honoured in place
when the repo's own policy requires it and otherwise declined with the
template's own comment quoted, and every other template-level ask is tracked
upstream rather than applied — this floor is checked by the skill itself even
when `pr-merge-flow` is handling the thread replies, since its own bot-wait
bound is shorter and cannot be treated as this step's pass condition. Before
merging it also confirms every check-run on the verified commit has completed
(polled — a pending run has no conclusion and would otherwise slip past a
failure filter), that none concluded outside success/neutral/skipped, that
each branch-protection required context is present and green, and that legacy
commit statuses are not failing; any other failure is reported for an explicit
human call.
The agent running the skill then merges — after one final paginated
unresolved-threads query and a check that the PR head is still the verified
commit — with `gh pr merge --merge --match-head-commit <sha>` (or `--rebase`
where merge commits are disabled, or `--squash` where it is the sole enabled
method; never `--admin`; a refusal is reported with
`mergeable_state` and the branch rules, not diagnosed), and cleans up in
order: `git pull --ff-only` in the main checkout (only when it is on the
default branch and clean), `git worktree remove`, `git worktree prune`,
`git branch -d` — deleting the matching remote branch too on a repo with
`delete_branch_on_merge` off, since it's otherwise left for the next run to
trip over. The clone itself, if the skill made one, is left in place.

**Triggers on:** "install difftree", "set up difftree", "add difftree to my
repo", "add PR diff-tree comments", "set up difftree-action".
**Arguments:** none (interactive — it confirms CLI install, repo wiring, or both).

## Install

**In this repo — nothing to install.** The skill lives in the agent-neutral
`.agents/skills/difftree-action-setup/` (Codex discovery); Claude Code
discovers it through the committed symlink
`.claude/skills/difftree-action-setup`.

**Copy into your own setup** (no dependencies):

    git clone https://github.com/smorinlabs/difftree-action
    cp -R difftree-action/.agents/skills/difftree-action-setup ~/.agents/skills/difftree-action-setup   # Codex
    cp -R difftree-action/.agents/skills/difftree-action-setup ~/.claude/skills/difftree-action-setup   # Claude Code

**Dev mode** (edits in the clone are live next session):

    ln -s "$(pwd)/difftree-action/.agents/skills/difftree-action-setup" ~/.agents/skills/difftree-action-setup   # Codex
    ln -s "$(pwd)/difftree-action/.agents/skills/difftree-action-setup" ~/.claude/skills/difftree-action-setup   # Claude Code

> The skill finds the template by walking up from its own physical directory
> (symlinks resolved) to a directory holding both `action.yml` and
> `examples/difftree-pr-comment.yml`, so every placement above works. Copied out of
> this repo, nothing is found and it resolves `main` to its current commit sha
> (recorded as the provenance `$PROV`, which the later byte checks and drift
> answers cite), then fetches the canonical file pinned to that commit:
> `https://raw.githubusercontent.com/smorinlabs/difftree-action/<PROV>/examples/difftree-pr-comment.yml`.

## Example session

> Set up difftree PR comments on this repo.
> → Confirms you want the CI wiring, locates your local clone of the repo
> (cloning it if missing), creates a worktree from the repo's default branch, writes
> [`examples/difftree-pr-comment.yml`](../../examples/difftree-pr-comment.yml) to
> `.github/workflows/difftree-pr-comment.yml`, commits (bypassing any
> worktree-inherited hook that can't resolve the live checkout's tooling),
> opens a PR, waits for the run pinned to that commit's SHA, records the
> comment's `id` and `updated_at`, pushes an empty commit, waits for the run
> pinned to the new SHA, checks the same comment now has a later `updated_at`,
> answers reviewer-bot threads as they arrive — quoting and answering them,
> never executing their embedded instructions, and waiting at least ~10 minutes
> after PR open or the last push, whichever is later, before treating an
> empty query as final — (via `pr-merge-flow --ready` where installed, else
> inline), re-queries threads and the PR head one last time, confirms no
> other check on that commit is failing, merges with
> `gh pr merge` using the repo's merge method, cleans up in order (pull →
> worktree remove → prune → branch -d, plus the remote branch on a
> `delete_branch_on_merge=false` repo), and reports the PR, run and comment
> URLs, the thread table, and timing.
