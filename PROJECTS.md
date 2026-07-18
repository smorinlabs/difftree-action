# Projects

## [x] Project P01: setup-difftree skill + canonical example workflow (v0.3.0)
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
- [x] [P01-T04] Open PR to `smorinlabs/difftree-action` — merged as #8, released v0.3.0

## [~] Project P02: rename setup-difftree → difftree-action-setup (v0.3.0 maintenance — chore, no release)
**Goal**: Rename the skill to a `difftree-action-*` family name so it no longer
collides with the difftree CLI repo's pointer skill. **Skill names are a global
namespace** — two skills both named `setup-difftree` clobber at install
(`~/.claude/skills/setup-difftree`, `~/.agents/skills/setup-difftree`) and shadow
each other on any shared discovery path. Renamed the CLI repo's pointer to
`difftree-setup` in parallel.

### Tests & Tasks
- [x] [P02-T01] `git mv` skill dir + docs page; retarget `.agents` symlink
- [x] [P02-T02] Update SKILL.md name/H1/cross-ref and README links
- [ ] [P02-TS01] `skillsmith verify` + skill-quality pass under the new name
- [ ] [P02-T03] Open PR to `smorinlabs/difftree-action`
