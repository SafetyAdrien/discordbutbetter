- Goal

Restore live markdown styling **inside** the message composer so that as the user types:

- `**texte**` → renders **bold**
- `*texte*` / `_texte_` → renders *italic* (text + caret visually leans)
- `__texte__` → renders underlined text
- `~~texte~~` → renders strikethrough
- `||texte||` → spoiler block
- ``code`` → inline code styling
- `[label](url)` → label styled as a link
- Existing line markdown (headers, quotes, lists, code blocks, subtext, separators) already styled — kept as-is.

## Where to change

Single file: `src/components/chat/InputMarkdownOverlay.tsx`, in `renderInlineMarkdownOnly` (the function that draws the colored overlay above the `<textarea>`). No edits to `MessageInput.tsx`, no parser changes.

## What to do

For each inline match, replace the current "uniform-weight" inner `<span>` with one that carries the real visual style, **only on the inner content** (between the delimiters), keeping the delimiters muted as today:

- `**…**` → inner span gets `font-bold`
- `*…*` and `_…_` → inner span gets `italic`
- `__…__` → inner span gets `underline` (already present, keep)
- `~~…~~` → `line-through` (already present, keep)
- `||…||` → keep current spoiler look (muted background)
- ``…`` → keep code styling, add `font-mono`
- `[label](url)` → label gets `text-primary underline`

Delimiter spans (`**`, `*`, `_`, etc.) stay at `text-muted-foreground/50`, same weight as the surrounding text, so they don't shift the caret.

## Known trade-off (caret alignment)

The overlay sits above the `<textarea>` and relies on identical glyph metrics so the textarea caret lines up with the visible characters. Today the overlay is intentionally locked to a single weight/style to guarantee this alignment — that's why bold/italic were removed previously.

Re-introducing real `font-weight: 700` / `font-style: italic` will produce a small horizontal caret drift on the affected segments with most fonts (the project font is `"gg sans"`, which does not have identical metrics across weights). Mitigations applied in the plan:

1. Bold/italic are scoped to the inner text only, not delimiters, so drift is bounded to the styled segment.
2. Add `font-synthesis: none; font-variant-numeric: tabular-nums;` on the overlay container to avoid double-synthesis.
3. No change to font-size or line-height — vertical alignment stays pixel-perfect.

Horizontal drift inside bold/italic spans is the accepted cost of this feature, matching what the user asked for ("le texte ainsi que le curseur deviendra penché").

## Validation

- Type `**hello**` in the composer → "hello" renders bold while typing, caret remains on the same line.
- Type `*hello*` → italic, caret visibly leans inside the span.
- Type `__hello__` → underlined.
- Mix with mentions and headers → existing behavior preserved.
- Sending the message produces unchanged raw markdown (parser untouched).  
  
CHOSE IMPORTANTE:   
Cela doit être comme sur Discord concernant les markdowns basique.