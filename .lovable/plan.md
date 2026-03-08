

# Enlarge System Message Text & Apply Full Context Menu to Thread System Messages

## Changes

### 1. Enlarge system message text (ChatArea.tsx, line 1304)
Change the system text line from `text-xs` to `text-sm` so it matches the size of regular message text. Only the text line is affected, not the thread embed below.

### 2. Apply full context menu to thread system messages (ChatArea.tsx, lines 1350-1360)
Replace the current minimal context menu (only "Supprimer") with the same styled, full-featured context menu used by regular messages:
- Same `ContextMenuContent` styling (`min-w-[220px] p-1.5 rounded-2xl shadow-[var(--shadow-elevation-3)] border border-border/50`)
- Emoji reaction row at the top
- Actions: Copier le texte, Copier le lien du message, Copier l'identifiant du message
- Separator + danger zone: Supprimer le message (for owner or moderators), Signaler (for others)

No "Répondre", "Épingler", "Créer un fil", or "Modifier" since this is a system message — only relevant actions.

### Files
| File | Lines | Change |
|------|-------|--------|
| `ChatArea.tsx` | 1304 | `text-xs` → `text-sm` |
| `ChatArea.tsx` | 1350-1360 | Replace minimal context menu with full styled context menu (emoji row + copy actions + delete/report) |

