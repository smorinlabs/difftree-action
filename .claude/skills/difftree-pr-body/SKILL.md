---
name: difftree-pr-body
description: >-
  Render a PR's diff tree into a marker-delimited "🌳 Diff tree" section of
  the PR body and keep it current as the PR evolves. Use when authoring a PR
  body, when updating a PR description after pushing commits, or when the
  user says "add a diff tree to the PR body" or "refresh the diff tree".
  Agent-driven alternative to the difftree-action PR comment for repos where
  all PR authoring goes through an agent and an extra bot comment is
  unwanted. Requires the difftree CLI (difftree-action-setup §1 installs it).
allowed-tools: Bash, Read, Write, Edit
---

# difftree-pr-body

Maintain a diff-tree section in a PR **body** — the agent renders and splices
it, so no GitHub Action and no extra comment is involved. The trade-off
against the difftree-action comment: the section is only as fresh as the last
agent body edit, so this fits repos where every PR body edit already goes
through an agent that re-syncs the description after pushes.

## The section

The section is the **same rendering the difftree-action comment carries** —
`### 🌳 difftree — changes in this PR` heading, closed 📱 plain-text fold,
open colored fold whose `<summary>` is the stats line — wrapped in markers at
the **bottom** of the PR body:

```markdown
<!-- difftree-pr-body:begin -->
<rendered body from step 1>
<!-- difftree-pr-body:end -->
```

- The markers are the splice contract: everything between and including them
  is owned by this skill and rewritten wholesale on refresh. Never hand-edit
  inside them; prose belongs above the `begin` marker.
- Color comes from GitHub inline math and shares a **~145-expressions-per-page
  budget** with every comment on the PR — so a repo using this skill should
  not also run the action's colored comment on the same PRs (avoiding the
  extra comment is this skill's point). See the README's
  "Color rendering — limits".

## 1. Render

Requires the difftree CLI on PATH — if missing, install it first
(difftree-action-setup §1: prebuilt binary, `cargo install difftree`, or a
repo flox env that provides it). Then, from the PR's checkout:

```sh
git fetch origin <base>                      # difftree needs the base history
difftree --pr=origin/<base> --committed --no-color > "${TMPDIR:-/tmp}/difftree-pr.txt"
node "<renderer>" < "${TMPDIR:-/tmp}/difftree-pr.txt" > "${TMPDIR:-/tmp}/difftree-section.txt"
```

`<base>` is the PR's base branch (`gh pr view --json baseRefName -q
.baseRefName` for an existing PR; the branch you are about to target when
creating one). On a shallow clone, `git fetch --unshallow origin <base>`
first — difftree computes `merge-base(base, HEAD)` and needs the full base
history.

`<renderer>` is difftree-action's `scripts/render-body.js` (composeBody minus
the comment-ownership marker; flags: `--color-section=` / `--plain-section=` /
`--no-advertise` / `--heading=`). Resolve it the way difftree-action-setup
resolves its template: walk up from this skill's physical directory to a repo
holding `action.yml` and `scripts/render-body.js`; copied out of the repo,
fetch `scripts/comment.js` and `scripts/render-body.js` into one temp dir,
pinned to the current `main` commit
(`gh api repos/smorinlabs/difftree-action/commits/main --jq .sha`, then
`https://raw.githubusercontent.com/smorinlabs/difftree-action/<sha>/scripts/<file>`).
Renderer warnings on stderr (a decline to plain) are informational, not
failures. **Fallback** when node or the renderer is unavailable: build the
section by hand as a single fold — `<summary>🌳 <stats line></summary>` (the
output's last line) with the tree in a ```` ```text ```` fence inside.

**Done when:** `difftree-section.txt` holds the rendered section — heading
first, tree present (colored folds, or the fallback fold).

## 2. Splice

- **Creating the PR:** compose the body as usual (summary first, reviewer
  detail in `<details>` blocks), then append the section verbatim at the
  bottom.
- **Updating an existing PR:** fetch the current body, strip any existing
  marker-delimited section, append the freshly rendered one at the bottom,
  and write the body back — fetch and write as close together as possible so
  a concurrent edit is not overwritten:

```sh
gh pr view <pr> --json body -q .body > "${TMPDIR:-/tmp}/pr-body.md"
awk '/<!-- difftree-pr-body:begin -->/{skip=1} !skip{print} /<!-- difftree-pr-body:end -->/{skip=0}' \
  "${TMPDIR:-/tmp}/pr-body.md" > "${TMPDIR:-/tmp}/pr-body-new.md"
# append the section built from step 1's render, then:
gh pr edit <pr> --body-file "${TMPDIR:-/tmp}/pr-body-new.md"
```

**Done when:** the PR body on GitHub contains exactly one
`difftree-pr-body:begin`/`end` pair, at the bottom, wrapping the step 1
render.

## 3. Keep it current

The section must match the diff the same way the prose must: whenever you
push commits and re-check the PR description against the diff, re-run steps
1–2 in that same pass. **Done when:** a fresh step 1 render is byte-identical
to the tree inside the section on GitHub — anything else means refresh it.

## See also

- `difftree-action-setup` — installs the difftree CLI (§1) and wires the
  self-updating PR *comment* instead; prefer the comment when pushes can
  bypass the agent (manual pushes, other collaborators), since it refreshes
  on every push with no agent involved.
- difftree CLI: <https://github.com/smorinlabs/difftree>
