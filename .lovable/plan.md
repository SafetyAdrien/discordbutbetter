

# Fix: Markdown overlay alignment in message input

## Problem

The current implementation uses a transparent `<textarea>` over an `InputMarkdownOverlay` that renders headers at different font sizes (`text-2xl`, `text-xl`, etc.). Since a `<textarea>` renders all text at the same size, the cursor position and line breaks don't match the overlay -- making the input broken and unusable.

## Solution

Keep the overlay approach but **don't change font sizes**. Instead, use **syntax highlighting** style: same font size for everything, but visually distinguish markdown with color and weight changes. This keeps perfect character alignment between the textarea and overlay.

### Visual indicators (same size as textarea text):
- `# Header` lines: **bold** + foreground color (white) -- the `#` prefix shown in a muted accent color
- `## Header` lines: **bold** + foreground color
- `### Header` lines: **semibold** + foreground color  
- `-# Subtext` lines: muted-foreground color, slightly dimmer
- Normal lines: transparent (textarea text shows through normally)

### Also fix: textarea should ALWAYS be `text-transparent` when overlay is active

Currently, the textarea conditionally applies `text-transparent` only when markdown patterns are detected. This causes a flash. Instead, always render through the overlay -- normal lines show in `text-foreground` color, non-markdown lines are transparent in the overlay so the textarea's own text shows.

## Files to modify

### 1. `src/components/chat/InputMarkdownOverlay.tsx`
- Remove the large font sizes (`text-2xl`, `text-xl`, `text-lg`)
- Replace with same-size styling: bold + color for headers, muted for subtext
- Normal lines: render in `text-foreground` (not transparent) so they're always visible through the overlay
- The `#`, `##`, `###`, `-#` prefixes rendered in a distinct muted/accent color

### 2. `src/components/chat/MessageInput.tsx`
- Make textarea always `text-transparent caret-foreground` (remove the conditional check on line 469)
- The overlay handles ALL text rendering -- no conditional switching

