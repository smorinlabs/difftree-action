# Projects

## [~] Project P01: setup-difftree skill + canonical example workflow (v0.3.0)
**Goal**: Ship an in-repo `setup-difftree` skill (loose `.claude/skills/`) that
installs the difftree CLI and scaffolds difftree-action into a repository,
backed by a single canonical `examples/pr-diff-tree.yml` that the README and the
skill both reference (one source of truth).

**Out of Scope**
- The difftree CLI repo's lightweight pointer skill (tracked in that repo).
- The Phase 1 binary-download action rework (see `PLAN.md`).

### Tests & Tasks
- [x] [P01-T01] Add canonical `examples/pr-diff-tree.yml` (consumer form, `@v0`)
- [x] [P01-TS01] `actionlint examples/pr-diff-tree.yml` passes
- [x] [P01-T02] Author `.claude/skills/setup-difftree/SKILL.md` + committed
      `.agents/skills/setup-difftree` symlink (Codex discovery)
- [x] [P01-T03] Add `docs/skills/setup-difftree.md`, README example link, and a
      "Set it up with an agent" section
- [x] [P01-TS02] `skill-quality` gate on `setup-difftree` passes
      (content ✓, docs ✓, `skillsmith verify` pass on claude-code + codex)
- [ ] [P01-T04] Open PR to `smorinlabs/difftree-action`
