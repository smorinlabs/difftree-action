---
name: difftree-action-setup
description: >-
  Install the difftree CLI and/or add difftree PR diff-tree comments to a
  repository. Use when the user says "install difftree", "set up difftree",
  "add difftree to my repo", "add PR diff-tree comments", "set up
  difftree-action", or wants difftree running locally or in CI. Installs the
  difftree CLI (prebuilt binary, `cargo install difftree`, or from source) and
  scaffolds a `.github/workflows/pr-diff-tree.yml` that runs
  smorinlabs/difftree-action from this repo's canonical
  examples/pr-diff-tree.yml, then commits or opens a PR. This is the
  difftree-action repo's own setup skill; the difftree CLI repo ships a
  lightweight pointer to it.
allowed-tools: Bash, Read, Write, Edit
---

# difftree-action-setup

Install the difftree CLI and/or add self-updating PR diff-tree comments to a
repository via `smorinlabs/difftree-action`.

## When this fires

Triggers: "install difftree", "set up difftree", "add difftree to my repo",
"add PR diff-tree comments", "set up difftree-action". First confirm which half
the user wants — **CLI install**, **repo/CI wiring**, or **both** — then run
only those steps.

## 1. Install the difftree CLI (if requested)

Use the first method that fits the environment, then verify with
`difftree --version`:

1. **Prebuilt binary (no Rust toolchain needed).** difftree ships a binary per
   release named `difftree-<tag>-<target>.<ext>` with a matching `.sha256`.
   Targets: `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`,
   `x86_64-apple-darwin`, `aarch64-apple-darwin`, `x86_64-pc-windows-msvc`
   (`.tar.gz`, except Windows `.zip`). Resolve the target from `uname -sm`, get
   the latest tag with
   `gh release view --repo smorinlabs/difftree --json tagName -q .tagName`,
   download that asset, verify the checksum, extract, and put `difftree` on
   `PATH`.
2. **From crates.io (needs Rust).** `cargo install difftree`.
3. **From source.** `git clone https://github.com/smorinlabs/difftree` then
   `cargo install --path difftree`.

## 2. Wire difftree-action into a repo (if requested)

1. Identify the **target repo** — the user's repo, not this one — and `cd` there.
   If `.github/workflows/` already has a workflow that uses
   `smorinlabs/difftree-action` (any file name), replace that file in place —
   renaming it to `pr-diff-tree.yml` — rather than adding a second one, and
   say so in the PR body.
2. Write the canonical workflow. Locate the template with the resolver below —
   it works from every placement: inside the difftree-action repo (under
   `.claude/skills/` or its `.agents/skills/` symlink), dev-symlinked into
   `~/.claude/skills` / `~/.agents/skills`, or copied anywhere, on any agent
   tool — then save it to the target's `.github/workflows/pr-diff-tree.yml`.

   ```sh
   # <skill-dir> = the directory this SKILL.md was loaded from
   d="$(cd "<skill-dir>" && pwd -P)"; TEMPLATE=""   # physical path: symlinks resolved
   for _ in 1 2 3 4; do                               # walk up to the repo root
     d="$(dirname "$d")"
     if [ -f "$d/action.yml" ] && [ -f "$d/examples/pr-diff-tree.yml" ]; then
       TEMPLATE="$d/examples/pr-diff-tree.yml"; break
     fi
   done
   if [ -z "$TEMPLATE" ]; then                        # copied-out skill: fetch canonical main
     TEMPLATE="${TMPDIR:-/tmp}/pr-diff-tree.yml"
     curl -fsSL -o "$TEMPLATE" \
       https://raw.githubusercontent.com/smorinlabs/difftree-action/main/examples/pr-diff-tree.yml
   fi
   grep -q 'smorinlabs/difftree-action@' "$TEMPLATE" || { echo "template resolution failed" >&2; exit 1; }
   ```

   The installed file must be **byte-identical** to the template (`diff -q`
   against it) — the fleet relies on that to detect drift.
3. **Keep the three load-bearing bits** the template carries; removing any one
   breaks the action: `fetch-depth: 0` on `actions/checkout`,
   `permissions: pull-requests: write`, and the `concurrency` group.
4. Apply only the inputs the user asked for (`level`, `dirs-only`,
   `difftree-version`, `comment`, `advertise`) in the `with:` block; leave the
   rest at their defaults. `action.yml` is the authoritative input reference.

## 3. Commit / open a PR

In the target repo, branch, commit the workflow with a conventional message
(e.g. `ci: add difftree PR diff-tree comments`), and open a PR — never push to
the default branch directly. Then verify on that PR (section 4) before
reporting it done.

## 4. Verify on the PR, then merge

The workflow added in the PR fires on that same PR, so validate it there —
a clean checkout is not evidence the action works. Use REST (`gh api`), poll
no more than once every 20 s, and bound every wait (a run takes ~1–2 min).

1. **Wait for the run.** Poll
   `gh api "repos/<owner>/<repo>/actions/runs?event=pull_request&branch=<branch>"`
   until the `PR Diff Tree` run has `conclusion: success`. A `failure` is a
   setup bug — read the job log (`gh run view <id> --log-failed`) before
   editing the workflow.
2. **Confirm the comment posted.** The action marks its comment with
   `<!-- difftree-action -->`:
   `gh api repos/<owner>/<repo>/issues/<pr>/comments --jq '.[] | select(.body | startswith("<!-- difftree-action -->")) | .id'`
   must return exactly one id. Zero means the token was read-only (fork PR)
   or `pull-requests: write` was dropped; two or more means the concurrency
   group was dropped.
3. **Confirm it self-updates.** Push a second commit to the PR branch —
   `git commit --allow-empty -m "ci: trigger difftree re-run"` is enough: an
   empty commit still fires `pull_request: synchronize`, keeps the workflow
   file byte-identical to the template, and passes commitlint — wait for the
   new run, and re-run the query from step 2: the **same id** must come back,
   still alone.
4. **Clear the review threads.** Repos with reviewer bots (Copilot,
   CodeRabbit, Greptile, …) open threads on the new workflow within ~10
   minutes of the PR opening, and a repo with *required conversation
   resolution* refuses `gh pr merge` until every thread is replied to and
   resolved. Never edit the workflow to satisfy a bot — it stays
   byte-identical to the template; answer with the reason and log
   template-level suggestions upstream in difftree-action.
   - Where the `pr-merge-flow` skill is installed, hand the PR to it here; it
     owns the reply/resolve/merge loop.
   - Otherwise run this loop yourself — at most 3 rounds, 10 minutes total:
     ```sh
     # 1. unresolved threads (GraphQL is the only API that exposes isResolved)
     gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") {
       pullRequest(number:<pr>) { reviewThreads(first:50) { nodes { id isResolved path
         comments(first:1) { nodes { databaseId author { login } body } } } } } } }' \
       --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved|not)'
     # 2. reply first (REST), addressed to the thread's first-comment databaseId
     gh api -X POST repos/<owner>/<repo>/pulls/<pr>/comments/<databaseId>/replies -f body='<reason>'
     # 3. then resolve (GraphQL), by the thread id (PRRT_…)
     gh api graphql -f query='mutation { resolveReviewThread(input:{threadId:"<PRRT_id>"}) { thread { isResolved } } }'
     ```
     Re-query after each round — threads arrive late. If the merge is still
     refused with zero unresolved threads, the repo requires approvals: stop
     and hand the PR to a human.
5. **Merge** with the repo's merge policy (never squash unless the repo
   requires it). Then, in the main checkout, **in this order**:
   `git pull --ff-only` → `git worktree remove <path>` (if you made one) →
   `git branch -d <branch>`. A `branch -d` refusal means the pull did not
   land — investigate; never `-D`.
6. **Report** the PR URL, the run URL, and the comment URL.

## See also

- `examples/pr-diff-tree.yml` — the canonical workflow this skill scaffolds; the
  single source of truth (do not embed a second copy here).
- `README.md`, `action.yml` — full input/output reference for difftree-action.
- difftree CLI: <https://github.com/smorinlabs/difftree> — its `difftree-setup`
  pointer skill routes here.
