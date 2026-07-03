# Real custom-theme retint (no more filter overlay)

## Problem
Today `CustomThemeTintLayer` paints a single `mix-blend-mode: soft-light` gradient over the whole app. That's why it feels like "just a filter": semantic tokens (`--background`, `--card`, `--sidebar`, `--muted`, `--border`, `--foreground`, `--primary`, etc.) never change. Sections, modals, inputs, text, borders all keep their original dark/light values.

## Goal
When custom theme is active, every surface, text and accent is actually re-derived from the user's chips + intensity, in both dark and light modes — like Discord. The blended overlay is removed.

## Approach

### 1. Derive a full palette from the chips
Add `src/lib/customTheme/palette.ts`:
- Input: `chips[]`, `intensity` (0–100), `mode: 'dark' | 'light'`.
- Convert the primary chip (chip 0) to HSL → `baseH`, `baseS`.
- Blend factor `k = intensity / 100 * 0.85` (cap so text stays readable).
- Produce an HSL token map by mixing each base dark/light token's hue toward `baseH` and its saturation toward `baseS * k`, keeping the original lightness (so contrast is preserved):
  - `background`, `foreground`
  - `card`, `card-foreground`, `popover`, `popover-foreground`
  - `muted`, `muted-foreground`, `accent`, `accent-foreground`
  - `border`, `input`, `ring`
  - `sidebar-background`, `sidebar-foreground`, `sidebar-accent`, `sidebar-border`, `sidebar-ring`
  - `primary`, `primary-foreground` (uses chip 0 directly; foreground picked by luminance)
  - `secondary`, `secondary-foreground`
  - `chat-hover`, `channel-hover`, `server-list-bg`, `channel-list-bg`, `main-bg`, `member-list-bg`, `chat-input-bg`, and any other app-specific surface token already in `index.css`
- Output: `{ [cssVar: string]: string /* "H S% L%" */ }`.

### 2. Apply the palette from `useCustomTheme.applyToDom`
- Remove the gradient/overlay path.
- When `shouldRender`:
  - Detect current mode from `document.documentElement.classList.contains('light')`.
  - Compute palette, then `root.style.setProperty(name, value)` for every token.
  - Add `html.custom-theme` (existing class stays for scoped rules).
  - Also expose a subtle gradient variable `--ct-accent-gradient` for hero/nav accents that already opt in — no full-page overlay.
- When disabled: `root.style.removeProperty(...)` for every token we set (track the applied keys in a module-level `Set`) and remove `custom-theme`.
- Re-run the recompute on theme mode change: subscribe to a `MutationObserver` on `documentElement` `class` attribute (dark ↔ light toggle).

### 3. Remove the filter overlay
- Delete `<CustomThemeTintLayer />` usage from `App.tsx` (and the component file).
- Strip the `.custom-theme-overlay`, `mix-blend-mode` and `--ct-gradient` / `--ct-intensity` rules from `src/index.css` (keep `.discord-theme-sheet` scoped tokens intact; keep `[data-ct-lift]` since it no longer needs isolation but is harmless — remove for cleanliness).

### 4. Side-sheet live preview
- `CustomThemeSheet` already flips `draft.enabled = true` on open and `applyDraft` commits — works unchanged because `applyToDom` now retints tokens live via the same rAF path.
- The sheet keeps its own scoped tokens (`--discord-sheet-*`), so it stays crisp regardless of the app palette.

### 5. Persistence & sync
Unchanged. `user_ui_preferences.custom_theme` already carries `{enabled, chips, intensity, angle}`. `angle` is kept for the optional `--ct-accent-gradient`.

## Technical details

Files touched:
- `src/lib/customTheme/palette.ts` (new) — pure function `buildPalette(chips, intensity, mode)`.
- `src/hooks/useCustomTheme.ts` — rewrite `applyToDom` to write token vars; add mode observer; track applied keys for clean removal.
- `src/components/appearance/CustomThemeTintLayer.tsx` — delete (or reduce to just calling `useMountCustomTheme` if kept for the mount hook; prefer moving the mount into `App.tsx` directly).
- `src/App.tsx` — replace `<CustomThemeTintLayer />` with a `useMountCustomTheme()` call in the root component.
- `src/index.css` — remove overlay rules; keep sheet-scoped tokens.

Blending formula (per token, in HSL):
```text
H' = baseH
S' = clamp(origS + (baseS - origS) * k, 0, 100)
L' = origL                     // preserve contrast
```
`primary` = chip 0 verbatim; `primary-foreground` = white/black by luminance.

Fallback: single-chip themes still get a full retint (angle/gradient only affects the accent variable). 2–3 chips: `--ct-accent-gradient = linear-gradient(angle, chips…)` available for components that want it.

## Verification (Playwright)
1. Open Personnaliser → move HSV picker → screenshot: sidebar, header, chat, member list all shift hue live.
2. Toggle Dark ↔ Light while custom theme active → palette re-derives, contrast preserved.
3. Click Apply → reload → same palette restored from Supabase.
4. Disable → all tokens revert to default dark/light.
