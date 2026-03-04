

# Fix: Backslash escaping renders entire line as plain text

## Problem

From the Discord reference screenshots:
- `**Test**` → renders bold **Test**
- `\**Test**` → renders plain text `**Test**`

Currently, when a line starts with `\`, the code strips just the `\` and first character (`line.replace(/^\\(.)/, '$1')`) but still runs `tokenizeInline` on the result. This means `\**Test**` becomes `**Test**` which is then parsed as bold — the exact opposite of what should happen.

The user previously chose **"Texte brut de ligne"**: a `\` at the start of a line forces the entire line to be plain text with no markdown processing.

## Fix

Two locations need the same change:

### 1. `src/lib/markdown.tsx` — inline-only path (lines 761-769)

When a line starts with `\`, strip the `\` and render the rest as **literal plain text** (no `tokenizeInline`):

```tsx
if (line.startsWith('\\')) {
  const plainText = line.slice(1);
  return <React.Fragment key={i}>{plainText}{i < lines.length - 1 && <br />}</React.Fragment>;
}
```

### 2. `src/lib/markdown.tsx` — `parseBlocks` (lines 395-400)

The escaped paragraph block currently pushes `line.slice(1)` as a `paragraph` type, which still gets inline-parsed by `renderBlockToken`. Change to a new `escapedParagraph` type:

```tsx
if (/^\\/.test(line)) {
  blocks.push({ type: 'escapedParagraph', content: line.slice(1) });
  continue;
}
```

### 3. `src/lib/markdown.tsx` — `renderBlockToken`

Add a case for `escapedParagraph` that renders content as plain text without `renderInlineContent`:

```tsx
case 'escapedParagraph':
  return <React.Fragment key={key}><span>{block.content}</span>{!isLast && <br />}</React.Fragment>;
```

### 4. `BlockToken` type

Add `'escapedParagraph'` to the type union.

## Files changed

| File | Change |
|------|--------|
| `src/lib/markdown.tsx` | Add `escapedParagraph` block type; skip inline parsing for `\`-prefixed lines in both code paths |

