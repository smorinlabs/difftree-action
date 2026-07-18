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
2. Write the canonical workflow: read `examples/pr-diff-tree.yml` from this
   (difftree-action) repo — relative to this skill it is
   `../../examples/pr-diff-tree.yml`; if unreachable, fall back to
   `https://raw.githubusercontent.com/smorinlabs/difftree-action/v0/examples/pr-diff-tree.yml`
   — and save it to the target's `.github/workflows/pr-diff-tree.yml`.
3. **Keep the three load-bearing bits** the template carries; removing any one
   breaks the action: `fetch-depth: 0` on `actions/checkout`,
   `permissions: pull-requests: write`, and the `concurrency` group.
4. Apply only the inputs the user asked for (`level`, `dirs-only`,
   `difftree-version`, `comment`, `advertise`) in the `with:` block; leave the
   rest at their defaults. `action.yml` is the authoritative input reference.

## 3. Commit / open a PR

In the target repo, branch, commit the workflow with a conventional message
(e.g. `ci: add difftree PR diff-tree comments`), and open a PR — never push to
the default branch directly. Report the PR URL.

## See also

- `examples/pr-diff-tree.yml` — the canonical workflow this skill scaffolds; the
  single source of truth (do not embed a second copy here).
- `README.md`, `action.yml` — full input/output reference for difftree-action.
- difftree CLI: <https://github.com/smorinlabs/difftree> — its `difftree-setup`
  pointer skill routes here.
