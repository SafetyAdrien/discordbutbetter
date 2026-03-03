

# Fix: Synchroniser parfaitement l'overlay Markdown avec le textarea bio

## Problème

Le textarea bio utilise `px-3 py-2` comme padding, mais l'overlay Markdown a un padding hardcodé `py-2.5 pr-1` (sans `px`) — conçu pour le chat input. Résultat : le texte formaté est décalé horizontalement et verticalement par rapport au curseur.

## Solution

### 1. `src/components/chat/InputMarkdownOverlay.tsx`
- Ajouter une prop optionnelle `className?: string`
- Quand `className` est fourni, l'utiliser **à la place** du padding par défaut (`py-2.5 pr-1 min-h-[40px]` / `py-1 pr-2 min-h-[28px]`)
- Le reste (absolute, inset-0, pointer-events-none, whitespace, etc.) reste inchangé

### 2. `src/components/account-settings/ProfileSettingsTab.tsx`
- Passer `className="px-3 py-2 min-h-[80px]"` au `InputMarkdownOverlay` — exactement le même padding que le textarea

### 3. `src/components/profile/ServerProfileEditModal.tsx`
- Même chose : `className="px-3 py-2 min-h-[80px]"` sur le `InputMarkdownOverlay`

Cela garantit que l'overlay et le textarea partagent le même box model, éliminant tout décalage.

