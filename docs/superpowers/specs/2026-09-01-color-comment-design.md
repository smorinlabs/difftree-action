# Colored PR comment via GitHub inline math — design (v0.6.0)

Status: approved by owner 2026-09-01 after a Codex adversarial review; implemented in this PR.
Project: `PROJECTS.md` P04. Practitioner docs distilled from this spec:
[`docs/github-math-color-guide.md`](../../github-math-color-guide.md) (what works / don't do this / troubleshooting)
and [`examples/github-math-color-examples.md`](../../../examples/github-math-color-examples.md) (copy-paste catalog).

## 1. Goal

Render the sticky PR comment in color by default — status marks by git state,
`+N` green / `−M` red churn, summary line — mirroring `difftree`'s terminal
colors, using GitHub's inline-math renderer. `color: "false"` restores the
plain code-fence comment byte-for-byte. Large trees are split inside one
comment: as many lines as the page budget allows in color, the rest in the
plain fence, the summary line colored last.

## 2. Boundaries (must not change)

| Boundary | Guarantee | Enforcement |
|---|---|---|
| difftree CLI (`smorinlabs/difftree`) and its invocation (`--pr=origin/<base> --committed --no-color`, `--json`) | Untouched | `action.yml` "Run difftree" step not edited; color is applied to the plain text afterwards |
| Outputs `tree`, `files-changed`, `base`, `empty`, `tree-file`; job summary | Byte-identical | Same untouched step |
| `color: "false"` comment | Byte-identical to pre-change output for empty × truncated × advertise | `test/fixtures/plain-golden.json` captured from the unmodified code; 8-way golden test |
| Plain section inside the hybrid body | Today's fence + today's `truncateTree` rule/notice | Same functions reused |
| Sticky mechanics (`MARKER` first line, `isOwned`, `pickExisting`, `upsertComment`, dedupe, 403 warning) | Untouched | Functions not edited; MARKER first in both modes |

## 3. Measured facts (GitHub, 2026-09-01)

Probes were pasted into `smorinlabs/harness-kit` issues #14–#20 and PR #13
(all closed, kept as evidence). Real action output came from
`smorinlabs/difftree-action` PR #24 (`test/fixtures/pr24-tree.txt`).

| Fact | Evidence |
|---|---|
| Only per-line inline expressions (`` $`…`$ ``) render flush-left with even spacing; plain newlines are hard breaks, `<br>` doubles the gap | rounds 2–3, probe G |
| Display math (`$$`, ```` ```math ````, `flalign*`, `<div align=left>`, one-cell table) is always centred | rounds 1, 3 |
| `array{l}` rows are centred (browser MathML Core ignores column alignment); trailing `~` padding is trimmed; `\rlap` renders empty; `\phantom`/`\hphantom`/`\unicode` are banned; `\char"XX` draws the wrong glyph; `\textbackslash`/`\textasciicircum`/`\textasciitilde` error in text mode | probes B, C, D, F, round 4 |
| One expression > ~7–10 KB fails | probes D4 (ok, 7 KB) / E (fail, 10 KB) |
| Clean page renders 145 per-line expressions; #146 fails "Unable to render expression"; budget is per page and shared across comments (saturated PR #13 rendered nothing new) | probe A (120 ok), probe G (fail at #146), PR #13 |
| No 50-`\color`-per-expression cap (90 rendered) | probe C |
| Hex `\color{#rrggbb}` works; all 11 difftree mark glyphs render; palette legible in light and dark | round 4, probe B7 |
| The fallback `│` glyph is not one `~` cell wide, so pure-space prefixes drift; an invisible `{\color{transparent}\texttt{│}}` in place of the first space fixes it (`\color{transparent}` is accepted) | probe I (harness-kit #22), 2026-09-01 |
| Escapes that work inside `\texttt{}`: `\_ \# \& \% \{ \} \$`, `\^{}`, `\~{}`, space→`~`; backslash via `}\backslash\texttt{`; `< > \| ' " -> --`, accented and CJK pass through; backtick has no encoding | probes B6, D5 |

## 4. Design

**Input.** `color` (default `"true"`) → `DIFFTREE_COLOR` env on the comment step → `composeBody(tree, { color })`.

**Rendering** (`scripts/comment.js`): each line → one expression. Line grammar from difftree `TerminalRenderer::node`: `{prefix}{├──|└──} {mark} {name}{metric}`; mark is a glyph or a space (directories); metric ` +N −M` or ` (N files, +N −M)`; names may contain spaces and ` -> `. Header (`PR: …` etc.) gray; root plain; footer kind labels by `ChangeKind::color()` plus churn; unmatched lines plain `\texttt{}`. Input normalized (`\r\n`→`\n`, trailing whitespace stripped). Palette = GitHub Primer mid-tones keyed by difftree's `colored::Color` names; tables mirror `src/lib.rs` `mark()`/`mark_color()`/`ChangeKind::color()` at v0.3.1.

**Budget and split** (`splitForColor`):
- `MAX_COLOR_EXPRESSIONS = 100` (owner decision; 45 of margin under the measured 145).
- `COLOR_BYTES_MAX = 24576` bounds the colored section's markup so long paths cannot exceed the 65,536 comment limit on their own.
- `fixed` = header/root/footer expressions actually emitted; `k = min(100 − fixed, N, index of first body line containing a backtick)`; then decrement `k` until the colored bytes fit. `k ≤ 0`, or a backtick in header/root/footer → today's plain body.
- Hybrid body: colored header/root/lines 1..k → notice `_…and N−k more lines below (plain — …)._` → plain fence with lines k+1..N (truncated with today's `truncateTree` if the remaining budget requires) → truncation notice if upstream or suffix truncation happened → colored footer → `<sub>` footer.
- `action.yml` still calls `truncateTree(rawTree)` first; the color path never un-truncates and only truncates the plain suffix further.

**Honest guarantee.** The action keeps *its own* comment within budget. Other math on the same page can still push GitHub over its limit; README documents this and `color: "false"` is the escape hatch.

## 5. Codex adversarial review (plan v3 → v4)

| Finding | Resolution |
|---|---|
| Page-global limit makes "never broken" impossible with a fixed budget | Guarantee reworded; README limits section |
| Colored prefix alone could exceed 65,536 bytes | `COLOR_BYTES_MAX` + adversarial size tests |
| Post-expansion size guard conflicted with the pre-composition `truncateTree()` | Ordering defined (see §4) |
| Grammar contradicted the README sample (mark after name) | README sample was an outdated mock-up; replaced with real output |
| Backtick protection excluded header/root/footer/unmatched lines | Header/root/footer backtick → plain body; unmatched lines follow the body split rule |
| Expression budget incoherent when header absent | `fixed` counts only what is emitted |
| `v0` flip without canary/rollback | Canary via the SHA-pinned `ts-launch-blueprint` before the release PR; rollback = `color: "false"` or a v0.6.1 default flip |

## 6. Rollout

`feat` → release-please v0.6.0 → `v0` moves → all installed fleet repos render in color on their next PR event (owner accepted). Dogfood on this repo's own PR (`uses: ./`); canary on `ts-launch-blueprint` (SHA pin bump) before merging the release PR.
