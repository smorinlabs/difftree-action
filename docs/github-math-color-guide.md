# GitHub math color — what works, what doesn't, how to troubleshoot

difftree-action colors its PR comment with GitHub's **inline-math renderer**: each
line of difftree's plain output becomes one `` $`…`$ `` expression whose parts are
wrapped in `\texttt{}` and `\color{}`. This guide records what was verified on
GitHub on 2026-09-01 (probe issues `smorinlabs/harness-kit` #14–#20, PR #13) so
nobody has to rediscover it. Copy-paste samples for everything in the "works"
column live in [`examples/github-math-color-examples.md`](../examples/github-math-color-examples.md).
The design and the measurement log are in
[`docs/superpowers/specs/2026-09-01-color-comment-design.md`](superpowers/specs/2026-09-01-color-comment-design.md).

Mental model: GitHub runs **MathJax** over the TeX to produce **MathML**, and the
browser draws that MathML natively (MathML Core in Chrome/Safari/Firefox). Most
limits below come from one of those two stages.

## What works

| Need | Use | Notes |
|---|---|---|
| Inline colored text | `` $`{\color{#2da44e}\texttt{●}}`$ `` | Dollar-**backtick** delimiters: inline, left-aligned, and protected from markdown (`_`, `*`) |
| Monospace text | `\texttt{…}` inside the expression | Every space must be `~` — spaces inside math collapse |
| Colors | Hex `\color{#rrggbb}` or named (`red`, `green`, `blue`, `orange`, `gray`) | Hex verified; the action's palette (Primer mid-tones) reads well in light and dark theme |
| Multiple colors on one line | Sequence of groups: `\texttt{a}{\color{#…}\texttt{b}}\texttt{c}` | No spacing is added between adjacent groups |
| Line breaks between expressions **in a comment** | A plain newline | GitHub comments render newlines as hard breaks |
| Line breaks **in a `.md` file** | `<br>` at line end | `.md` files treat newlines as spaces |
| Special characters inside `\texttt{}` | `\_ \# \& \% \{ \} \$`, caret `\^{}`, tilde `\~{}`, space `~` | All verified |
| Backslash | Close the group, emit math `\backslash`, reopen: `\texttt{a}\backslash\texttt{b}` | There is no text-mode backslash macro that GitHub accepts |
| Pass-through characters | `< > \| ' " -> --`, accented letters, CJK | Render as typed (no TeX ligatures) |
| difftree's mark glyphs | `● ○ ◐ ? ↻ ⧉ × ◆ ‼ ⚠ !` | All render in the math font |
| Box-drawing characters | `├── └── │` inside `\texttt{}` | Render; every expression starts at the left margin |
| Equal-width indentation without a `│` | `{\color{transparent}\texttt{│}}\texttt{~~~}` in place of four spaces | `│` is not in the math monospace font, so its width differs from a `~` cell; an invisible `│` keeps `    ├──` aligned with `│   ├──` (probe I2) |

### Foldable sections (`<details>`) — verified facts (probes J/K/L, harness-kit #23–#25)

- `<details>` and `<details open>` both survive GitHub's comment sanitizer;
  the `open` attribute controls the default state and the reader can toggle it.
- Math inside an initially **closed** fold renders correctly after expanding
  (probe J3) — a colored tree may be folded either way.
- **Blank lines are required** after `<summary>` and before `</details>`;
  without them the content renders on one line (probe J4).
- A `<summary>` can carry the stats line, so a fully collapsed comment still
  shows the result (probe K2). Only grammar-matching, HTML-escaped text goes
  there; anything else gets a static label.
- Whether folded-closed expressions count against the ~145-per-page math budget
  is an **assumption** (kept conservative: the action's 100-expression cap
  applies comment-wide); J3 only proves expansion-time rendering works.
- Fences inside folds use a delimiter one backtick longer than the longest
  backtick run in the content, so hostile filenames cannot close the fold.

## Don't do this

| Don't | What you see | Why | Do instead |
|---|---|---|---|
| `$$…$$`, ```` ```math ````, `\begin{flalign*}…&&`, `<div align="left">`, a one-cell table | Block is **centered** | Display math is centered by GitHub CSS; wrappers cannot override it | One inline `` $`…`$ `` per line |
| `$$…$$` *inline* | Big gaps between lines | Still block-level display math with margins | `` $`…`$ `` |
| `<br>` at the end of comment lines | Double spacing | A comment newline is already a break | Newline only (use `<br>` in `.md` files only) |
| `\begin{array}{l} … \\ … \end{array}` to pack lines | Rows of different width **drift right** | Browser MathML Core ignores column alignment; rows are centered | One expression per line |
| Trailing `~` to pad rows to equal width | Still drifts | Trailing whitespace inside text is trimmed by the renderer | — (padding cannot fix arrays) |
| `\rlap{…}` | Renders **empty** | Zero-width boxes collapse | — |
| `\phantom{…}`, `\hphantom{…}` | `The following macros are not allowed: phantom` | Banned by GitHub's MathJax config | — |
| `\unicode{x5C}` | `The following macros are not allowed: unicode` | Banned | `\backslash` for `\`; for a backtick, fall back to plain text |
| `\char"5E` | Renders the **wrong glyph** | Font mapping differs from the code point | `\^{}`, `\~{}`, `\backslash` |
| `\textbackslash`, `\textasciicircum`, `\textasciitilde` | `… is only supported in math mode` | Text-mode macros are not loaded | `\backslash` (math), `\^{}`, `\~{}` |
| Unescaped `#` | `'#' can not be used here` | `#` is a macro-parameter character | `\#` |
| Unescaped `_` or `^` | Subscript / superscript, or a parse error | Math operators | `\_`, `\^{}` |
| A backtick anywhere in the text | Expression ends early, garbage after it | Backtick is the delimiter of `` $`…`$ `` | There is no escape — render that line plain |
| Plain spaces inside `\texttt{}` | Words run together | Spaces collapse in math | `~` |
| A 7+-character hex token (commit SHA), `@name`, or `#123` inside an expression | That token renders alone, or the expression breaks | GitHub's **autolinker runs inside math source** and injects `<a>` (visible in `body_html`) | Break the token across groups: `590596}\texttt{4`, `@}\texttt{types`, `\#}\texttt{26` |
| Four `~` to indent under the last child of a directory | Those rows drift left or right of the `│   ` rows | The fallback `│` glyph and a `~` cell have different widths (`││││x` vs `~~~~x` do not line up) | Invisible `│`: `{\color{transparent}\texttt{│}}\texttt{~~~}` |
| Emoji inside an expression | Missing or replaced glyphs | Not in the math fonts | Keep emoji in normal markdown (e.g. the heading) |
| More than ~145 expressions **on the page** | `Unable to render expression` from some point onward | A per-**page** rendering budget shared by every comment on it | Stay ≤ 100 per comment (the action's `MAX_COLOR_EXPRESSIONS`); fall back to a code fence for the rest |
| One expression larger than ~7–10 KB | `Unable to render expression` | Per-expression size cap | Keep expressions per-line |
| `\color` with ≥ 50 uses in one expression (an older community report) | — | **No longer a limit**: 90 colors in one expression rendered in 2026 | Not a constraint, but per-line expressions make it moot |

## Gotchas discovered along the way

1. **The page budget counts everything on the page, including your own earlier
   test comments.** Posting five probes to one PR and then previewing a sixth
   makes the sixth render nothing — the page is already full. Test on a fresh
   issue with no other math.
2. **Preview vs. post is not the difference; the page is.** A preview inside a
   saturated page fails exactly like a posted comment would.
3. **Errors are per expression.** One bad escape breaks only that line, and
   GitHub prints the error text in place of it — useful for bisecting.
4. **Hex colors do not adapt to the theme.** Pick mid-tones (the action's
   palette) and check both light and dark once.
5. **No color outside github.com.** Email notifications and some mobile views
   show the TeX source. Teams that review by email should set `color: "false"`.
6. **`.md` files vs. comments differ in line breaks** (see the tables above).
   A sample that looks right in a README needs its `<br>`s removed before it is
   pasted into a comment, and vice versa.
7. **Community threads about limits are stale.** The 2023 "50 colors per block"
   report no longer holds, and the "~50 expressions" folklore is really the
   ~145-per-page budget plus whatever else the page already carries.
   Re-measure rather than trust old numbers.
8. **`│` and a space are not the same width.** Rows whose prefix has no `│`
   (children of the last entry in a directory) drift unless the missing `│` is
   rendered invisibly with `\color{transparent}` — `\phantom` is banned.
9. **GitHub autolinks inside math.** Commit SHAs that exist in the repo, `@mentions`,
   and `#123` references get an `<a>` injected into the expression source before
   the math renderer runs (the merge-base SHA in difftree's header line hit this).
   `escapeTexttt` splits such tokens across `\texttt{}` groups.
10. **Directory lines have a space as their mark** (`├──   docs (3 files, …)`);
   a naive regex that requires a glyph misses every directory.

## Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Nothing renders, not even a trivial `` $`\texttt{x}`$ `` | Page budget exhausted, or the whole comment landed inside a code fence | Preview the same text in a fresh issue; make sure you did not paste an outer ```` ``` ```` wrapper |
| Renders up to line *N*, then `Unable to render expression` for the rest | Page budget (~145) reached | Count expressions already on the page (other comments too); split the tail into a plain fence |
| `The following macros are not allowed: …` | Banned macro (`phantom`, `unicode`, …) | Replace per the table above |
| `… is only supported in math mode` | A `\text…` macro inside `\texttt{}` | Use `\^{}`, `\~{}`, or `\backslash` |
| `'#' can not be used here` | Unescaped `#` | `\#` |
| Text centered | Display math or an array | Switch to per-line `` $`…`$ `` |
| Short rows shifted right in a packed block | Array rows are centered | Stop packing; per-line expressions |
| Double-spaced lines in a comment | `<br>` plus newline | Remove `<br>` |
| Lines run together in a `.md` file | Newlines are soft there | Add `<br>` (for the rendered doc only) |
| Words glued together | Spaces inside `\texttt{}` | Use `~` |
| Only a short hex string (or `@name`/`#123`) shows where a whole line should be | GitHub autolinked a token inside the expression | Inspect `body_html` via the API for an `<a>` inside `<math-renderer>`; split the token across groups |
| A filename shows a subscript or breaks the line | Unescaped `_` `^` `~` `\` `#` `$` `%` `&` `{` `}` | Run it through `escapeTexttt` (see `scripts/comment.js`) |
| One line renders as garbage after a backtick | Backtick in the text | No encoding exists; render that line plain (the action moves it and the rest to the fence) |

## How the action applies all this

- `scripts/comment.js` → `renderColorLine()` turns one plain difftree line into
  one expression; `escapeTexttt()` is the escape table; `splitForColor()` keeps
  the colored section within `MAX_COLOR_EXPRESSIONS` (100) and
  `COLOR_BYTES_MAX` (24 KB) and sends the remainder to a plain fence.
- `color: "false"` bypasses all of it and posts the plain code fence, byte-identical
  to the pre-v0.6.0 comment (pinned by `test/fixtures/plain-golden.json`).
- The difftree CLI and its flags are untouched; color is applied to the text
  the CLI already produced.
