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

The section is one foldable block, delimited by markers, living at the
**bottom** of the PR body:

````markdown
<!-- difftree-pr-body:begin -->
<details>
<summary>🌳 <stats line></summary>

```text
<full difftree output>
```

</details>
<!-- difftree-pr-body:end -->
````

- `<stats line>` is the **last line** of the difftree output (e.g.
  `4 dirs touched · 6 files changed (5 modified · 1 renamed) · +68 −28`), so
  the fold shows the shape at a glance even when closed.
- The markers are the splice contract: everything between and including them
  is owned by this skill and rewritten wholesale on refresh. Never hand-edit
  inside them; prose belongs above the `begin` marker.

## 1. Render

Requires the difftree CLI on PATH — if missing, install it first
(difftree-action-setup §1: prebuilt binary, `cargo install difftree`, or a
repo flox env that provides it). Then, from the PR's checkout:

```sh
git fetch origin <base>                      # difftree needs the base history
difftree --pr=origin/<base> --committed --no-color > "${TMPDIR:-/tmp}/difftree-pr.txt"
```

`<base>` is the PR's base branch (`gh pr view --json baseRefName -q
.baseRefName` for an existing PR; the branch you are about to target when
creating one). On a shallow clone, `git fetch --unshallow origin <base>`
first — difftree computes `merge-base(base, HEAD)` and needs the full base
history.

**Done when:** the file holds a tree whose header names `origin/<base>` and
whose last line is the stats line.

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
