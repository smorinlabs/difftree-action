# Plan — foldable plain + colored sections (v0.7.0)

Repo: `smorinlabs/difftree-action`. Status: PROPOSAL awaiting Codex adversarial review + owner approval. No repo files changed yet.
Evidence: probes J/K/L on `smorinlabs/harness-kit` issues #23–#25 (2026-09-01), all owner-verified on desktop and mobile.

## 1. Goal

The sticky PR comment carries BOTH renderings in foldable sections (`<details>`/`<summary>`), because the colored
inline-math rendering does not work on mobile or in email. Default layout (probe L1, owner-approved):

```
<!-- difftree-action -->
### 🌳 difftree — changes in this PR

<details>                                   ← plain fold, CLOSED by default
<summary>📱 Plain text version (mobile / email)</summary>

```(plain tree fence)```

</details>
<details open>                              ← colored fold, OPEN by default
<summary>🌳 {stats line, plain text}</summary>   ← e.g. "🌳 8 dirs touched · 8 files changed (7 modified · 1 renamed) · +101 −52"

$`…`$ colored tree (one expression per line)

$`…`$ colored footer

</details>
<sub>🌳 Get your own diff tree …</sub>       ← always visible
```

A collapsed colored fold still shows the stats in its summary (probe K2/L2). Section order is fixed: plain above colored.

## 2. Inputs (clear, consistent naming — owner-approved)

| Input | Values | Default | Meaning |
|---|---|---|---|
| `color-section` | `open` \| `closed` \| `hidden` | `open` | Colored tree in a fold whose summary is the stats line |
| `plain-section` | `open` \| `closed` \| `hidden` | `closed` | Plain fence in a fold labeled `📱 Plain text version (mobile / email)` |
| `color` (existing) | `true` \| `false` | `true` | **Deprecated alias.** `"false"` forces `color-section: hidden` regardless of `color-section` (documented precedence — a composite action cannot distinguish "default" from "explicitly set") |

Validation in the composer: an unrecognized value falls back to that input's default with a `core.warning`.

## 3. Semantics rules

1. `color-section` hidden (via either input) → the comment is the **legacy bare plain body** — no folds, byte-identical
   to `test/fixtures/plain-golden.json` — regardless of `plain-section`. Preserves the v0.5/v0.6 rollback contract.
2. Both sections hidden → rule 1 plus a `core.warning` ("both sections hidden; posting the plain comment").
3. `plain-section: hidden`, `color-section: open|closed` → heading, colored fold only, attribution.
4. MARKER stays line 1 in every mode (sticky mechanics untouched). Heading and attribution always outside folds.
5. Blank lines are REQUIRED around all content inside `<details>` and after `<summary>` (probe J4: without them the
   content renders on one line). The composer enforces them structurally, not by convention.
6. The `<summary>` stats line is difftree's plain footer line, HTML-escaped (`& < >`); if the footer is absent
   (unexpected input shape) the colored summary falls back to the static label `🎨 Colored diff tree`.
7. Empty diff (`empty: true`) → unchanged legacy text, no folds.
8. `advertise: false` → no `<sub>` line, as today.

## 4. Size and budget accounting (the comment now carries BOTH trees)

- Expression budget unchanged: `MAX_COLOR_EXPRESSIONS = 100` comment-wide — folded-closed math still counts against
  the page's ~145 budget (probe J3 rendered after expanding, meaning it was processed).
- Colored section: bounded exactly as today (`COLOR_BYTES_MAX = 24576`; large trees split inside the colored fold
  into colored head + notice + fenced remainder; colored markup never truncated mid-expression).
- Plain fold: always the COMPLETE tree when it fits. New accounting: after composing the colored fold,
  plain-fold budget = `GITHUB_COMMENT_LIMIT − everything else − SCAFFOLD_BUDGET`; overflow → today's `truncateTree`
  rule + notice inside the plain fold.
- `action.yml` still calls `truncateTree(rawTree)` first (unchanged); the composer only ever truncates further.
- The whole-body `≤ 65536` invariant is tested with adversarial inputs in BOTH sections simultaneously
  (e.g. 1,000 × 400-char lines: colored bounded at 24 KB, plain suffix truncated, total under the cap).

## 5. Boundaries (unchanged contracts, same as v0.6.0 plan)

| Boundary | Guarantee |
|---|---|
| difftree CLI + `Run difftree` step (`--no-color`, `--json`) | Untouched |
| Outputs `tree`, `files-changed`, `base`, `empty`, `tree-file`; job summary | Byte-identical |
| `color: "false"` / `color-section: hidden` body | Byte-identical to `plain-golden.json` (golden matrix re-used) |
| Sticky mechanics (`MARKER`, `pickExisting`, `upsertComment`, dedupe, 403) | Untouched |
| Rendering internals (`escapeTexttt`, autolink splitting, `│` spacer, palette) | Untouched — the folds wrap the existing renderers |

## 6. Files

| File | Change |
|---|---|
| `action.yml` | Two new inputs; `DIFFTREE_COLOR_SECTION` / `DIFFTREE_PLAIN_SECTION` env; pass through to `composeBody`. Bash step untouched. |
| `scripts/comment.js` | `composeBody(tree, { colorSection, plainSection, … })`; `color` alias mapping; fold assembly (`foldOpen/foldClosed` helpers with enforced blank lines); summary construction + HTML escape; plain-fold budget; validation warnings surfaced via a returned `warnings` array (the github-script step logs them — `comment.js` stays pure, no `core` dependency). |
| `test/comment.test.js` / `test/color.test.js` | Golden matrix re-pinned for `color-section: hidden`; L1 structure (order, `open` attrs, blank-line law, marker first, stats summary text); L2/L3 configs; hidden-plain; both-hidden fallback + warning; invalid values fallback; summary fallback label; adversarial size both-sections; >100-line split inside the fold; alias precedence. |
| `README.md` | Inputs table (3 rows incl. deprecated alias); sample section shows the L1 layout; **Limits section updated**: mobile/email now handled by the plain fold (no longer only a caveat). |
| `examples/difftree-pr-comment.yml` | Commented `color-section` / `plain-section` lines; `color` comment marked deprecated. |
| `PRD.md`, `.claude/skills/difftree-action-setup/SKILL.md` (+ docs mirror note), `docs/RUNBOOK.md` | Input list + acceptance step now expects the L1 fold layout. |
| `docs/github-math-color-guide.md` | New section: `<details>` facts — `open` survives the sanitizer, math inside an initially-closed fold renders after expanding, blank-line law, stats-in-summary pattern, folded math still counts against the page budget. |
| `examples/github-math-color-examples.md` | New example 9: the L1 foldable layout (regenerated via the shipped renderer). |
| `docs/superpowers/specs/2026-09-01-foldable-sections-design.md` | This plan, finalized, with probe links. |
| `PROJECTS.md` | New `P05: foldable plain + colored sections (v0.7.0)`. |

## 7. Verification & rollout

- TDD in a worktree (`feat/foldable-sections` from `origin/main`); `node --test`, actionlint, CI as today.
- Dogfood: the implementation PR's own comment renders the L1 layout; check desktop + mobile (owner), expand/collapse both folds.
- `body_html` machine-check: `<details>`/`<summary>`/`open` present, no anchors injected in math, plain fence intact.
- Canary: bump `ts-launch-blueprint` pin to the merge SHA → verify → release PR → v0.7.0 → `v0` moves → re-pin canary to tag.
- Rollback: `color-section`/`plain-section` per repo, `color: "false"` for full legacy, or v0.7.1 default flip.

## 8. Out of scope

- Device-conditional rendering (impossible in comment markup — folds are the mitigation).
- Changing the difftree CLI, marks, palette, or the escape/split renderers.
- A third format or per-fold custom labels (YAGNI until asked).

---

# v2 amendments (Codex adversarial review dispositions, 2026-09-01)

The sections above stand except where amended here. (Codex verdict head pending; findings below are from the ranked list.)

## A. Truncation-notice law — one notice, one defined location per mode
- Legacy body (`color-section: hidden`): notice exactly where it is today (after the fence) — golden-pinned.
- Colored-only (`plain-section: hidden`): today's hybrid placement inside the colored fold.
- Any visible plain fold: the plain fold owns the single user-facing notice, placed after its tree fence, emitted when upstream OR fold-budget truncation occurred. Never two notices. Tested "exactly once" per mode.

## B. Wording fix — "complete tree"
The plain fold holds the complete **post-`truncateTree` composer input** when it fits (production truncates raw trees > 64,768 chars before composition; the full output remains in the `tree` output and the job log, as the notice already says).

## C. Warnings contract — concrete shape and order
`composeBody` returns `{ body, warnings }` (pure; no `core` dependency). The github-script step destructures, calls `core.warning` per entry, passes only `body` to `upsertComment`. Deterministic order: (1) validate both raw section strings → invalid-value warnings + fallback to defaults; (2) apply `color:"false"` alias (forces hidden); (3) if resolved state is both-hidden → both-hidden warning + legacy plain body. Warnings never change the golden body.

## D. Closed-fold math budget — downgraded to conservative assumption
"Folded-closed expressions count against the page budget" is an assumption, not a verified fact (J3 only proves expansion-time rendering works). Keep `MAX_COLOR_EXPRESSIONS = 100` comment-wide as the conservative rule; document it as an assumption in the guide. Optional later probe; not a gate.

## E. Action-contract test
New test reads `action.yml` and asserts: both input declarations with defaults, the three env mappings, alias mapping in the script, `{ body, warnings }` destructuring, per-warning `core.warning`, body-only submission to `upsertComment`. (The smoke job runs `comment: false` and never exercises the comment step; dogfood remains the live proof.)

## F. Documentation sweep widened
- `PRD.md`: update normative FR-4.1 (comment shape), FR-4.5/FR-4.6 (two-stage truncation, folds) — not just the inputs table.
- `GOAL.md`: definition/success criterion/acceptance test that currently require the bare fence.
- Catalog: **replace/relabel** examples 7–8 (currently claim to be exact posted output) rather than only appending example 9.
- Guide + README: sweep existing "mobile/email" advice and "How the action applies this" sections, not only add new ones.

## G. Release gate hardened
Rollout complete only when: the release PR + manifest target 0.7.0 (feat commit present) → tag pushed → Release workflow green → `v0` resolves to the release commit → canary re-verified after promotion. Before release: inventory floating-`v0` vs SHA-pinned fleet repos (rollout-findings says 33 installed; pins like ts-launch-blueprint are sanctioned deviations). Fleet rollback trigger = re-tagging `v0` to the previous release commit (repo-local inputs are not a fleet rollback).

## H. Validation-order finding (Low)
Covered by C's deterministic order; test the exact warnings array for `color:"false"` + `color-section: bogus` + `plain-section: hidden`.

## I. Simplifications adopted (over-engineering cut)
1. When a plain fold is visible, the colored fold's large-tree suffix is NOT duplicated: the colored section renders its head + a one-line pointer to the plain fold ("…and N more lines in the plain text version above"). The fenced suffix inside the colored fold survives only when `plain-section: hidden`.
2. One `renderDetails({ open, summary, content })` constructor — single home for the blank-line/closing-tag invariant.
3. Exact fixed-markup accounting once; `SCAFFOLD_BUDGET` only as the adapter to `truncateTree`'s limit parameter.
4. No second footer parser: `splitForColor` additively exposes the raw footer line it already isolated.
5. Skill/mirrors carry input names + one acceptance assertion; the detailed desktop/mobile fold procedure lives in `docs/RUNBOOK.md` only, linked from mirrors.

## J. Test plan superset (from review §3)
Adds to §6: golden matrix × both legacy selectors and alias/explicit combinations; 9-state colorSection×plainSection table test (marker, order, open attrs, balanced tags, blank-line law, attribution outside); production-order composition with adversarial sizes incl. remaining-capacity edge cases around 768; ≤ 65,536 across fold states × advertise; intact `$`…`$` expressions; plain-fold prefix = exact truncateTree prefix; notice-location "exactly once" per mode; hostile summary/tree content (tag-shaped names, `</summary>`, triple-backtick-forming lines, `&<>`, link syntax) with body_html verification; renderer-decline cases × plain-section states; empty diff × all resolved states; folded advertise:false; absent/truncated footer → static label; `{ body, warnings }` shape + adapter wiring; all existing low-level renderer tests retained, whole-body expectations moved to the colored-only configuration.

## K. Budget algorithm made exact (resolves the Critical finding — verdict 4 VIOLATED in v1)
When the plain fold is visible, the colored fold NEVER carries the fenced plain suffix (amendment I.1); its notice
points to the plain fold. The dual-section assembly:
1. Compose all fixed markup exactly (marker, heading, both fold shells, summaries, colored expressions via
   `splitForColor` used atomically, notices, attribution) and measure it.
2. `remainingCapacity = GITHUB_COMMENT_LIMIT − fixedBytes`; if `remainingCapacity − SCAFFOLD_BUDGET <= 0`,
   the plain fold gets an empty fence + the notice (never a negative `slice` — `truncateTree(tree, limit)` with
   `limit < SCAFFOLD_BUDGET` slices from the END of the string and must never be called that way).
3. Else plain fold content = `truncateTree(tree, remainingCapacity)` (the helper subtracts SCAFFOLD_BUDGET itself —
   call it with the raw remaining capacity as its `limit`, not capacity + 768, and pin this convention with a test
   at capacities below / at / above 768).
4. Assemble once; assert `body.length <= GITHUB_COMMENT_LIMIT`; never repair an oversized body by slicing it.

## L. Injection containment layer (resolves verdict 5 VIOLATED)
Scope: FOLDED MODES ONLY. The legacy bare body (`color-section: hidden`) stays byte-identical — its raw-fence
behavior is the golden contract and is explicitly outside this guarantee (resolving the requirement 2 vs 5 conflict).
1. Plain fold fence: delimiter length = max(3, longest backtick run in the content + 1) — a fence hostile content
   cannot close; its actual delimiter bytes are part of the fixed-markup measurement (K.1).
2. Stats summary: used ONLY when the footer line matches a fully anchored difftree-footer grammar
   (`^\d+ dirs? touched · \d+ files?…` end-anchored over digits, kind words, `·`, `+N −M`); anything else → the
   static label `🎨 Colored diff tree`. Matching content is HTML-escaped anyway.
3. Colored-source guard: if any line to be placed inside a fold would emit a raw HTML tag delimiter sequence
   (`</` or `<` followed by an ASCII letter) into the math source, decline the colored fold for that comment and
   fall back to the legacy bare body with a warning — `escapeTexttt`, palette, spacer, renderers unchanged.
4. Proof: source-string assertions (exactly the composer-created `<details>`/`<summary>` tags, balanced) plus the
   live `body_html` machine-check on the dogfood PR counting details/summary elements.

## M. Renderer-decline semantics (resolves the second High finding)
Every existing decline path in `splitForColor` (backtick in header/root/footer or first body line, oversized fixed
lines, empty content) plus the new L.3 guard: decline OVERRIDES the requested sections — post the legacy bare plain
body and return a warning ("colored rendering declined: <reason>"). Tested for every decline cause × every
`plain-section` value, including `hidden`.

## N. Golden proof for both legacy selectors (resolves verdict 2 AT RISK)
`test/fixtures/plain-golden.json` is NOT modified. All eight entries run through: (a) `color:false` with explicit
`colorSection` of `open`, `closed`, and `hidden` (proving alias precedence byte-for-byte, 24 assertions), and
(b) explicit `colorSection:"hidden"` alone (8 assertions). MARKER-is-line-1 asserted in all nine section-state
combinations and every fallback (verdict 3's condition).

## O. Verdict summary of the v1 plan (for the record)
1 CLI/outputs HOLDS (plus an implementation diff-gate over action.yml:95-176 and 224-238) · 2 golden AT RISK → N ·
3 marker HOLDS (widened tests) · 4 budget VIOLATED → I.1 + K · 5 fold safety VIOLATED → L · 6 internals AT RISK → I.4
(additive `footerText` on `splitForColor`, no second parser).
