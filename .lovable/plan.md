## Plan de vérification — Pills de couleur

### Statut
Fix appliqué dans `src/components/chat/InputMarkdownOverlay.tsx`. En attente de build + vérification visuelle.

### Objectif
Rendre les pills de couleur (insertions via picker `<` et tokens manuels `<c:#hex>`) parfaitement alignés, avec une bordure visible sur les 4 côtés et un rendu identique dans le composer et les messages.

### Décisions validées

1. **Espace entre deux pills couleur consécutifs (picker `<`)**
   `handleMentionSelect` (`MessageInput.tsx:526-567`) ajoute un **espace réel** ` ` après chaque insertion via le picker.
   Deux pills consécutifs donnent `■ White ■ White`.

   > Note : le bouton Palette → "Insérer" (`insertColor`, `MessageInput.tsx:307-325`) n'ajoute pas d'espace de séparation.

2. **Ordre des box-shadow sur le pill couleur (avant fix)**
   `boxShadow: `${sideShadow(bg)}, 0 0 0 1px hsl(var(--border) / 0.65)``
   → sideShadow masquait les côtés horizontaux du ring de bordure.

3. **Fix appliqué — bordure via `outline` au lieu de `box-shadow`**
   Remplacé par :
   ```ts
   style: {
     backgroundColor: bg,
     boxShadow: sideShadow(bg),
     outline: '1px solid hsl(var(--border) / 0.65)',
     outlineOffset: '0px',
   }
   ```
   Appliqué aux deux endroits :
   - `renderMentionEntry` (kind === 'color')
   - `renderLegacyAndSpecialMentions` (branche `match[5]`)

   Pourquoi `outline` :
   - couche séparée de `box-shadow`, bordure visible sur 4 côtés ;
   - ne participe pas au box model, alignement caret/overlay intact ;
   - `outline-offset: 0` colle le bord sur le pill incluant les 2px de `sideShadow` latéraux.

### Fichiers modifiés
- `src/components/chat/InputMarkdownOverlay.tsx`

### Vérifications à effectuer après le build
1. Hard reload + purge SW/caches.
2. Insérer deux pills via picker `<` consécutivement → screenshot `1_two_pills_outline.png` : bordure uniforme sur les 4 côtés, vrai espace entre les pills.
3. Cliquer juste avant / juste après un pill → caret au bord visuel, pas de décalage 1-2px.
4. Taper `<c:#ff0000>` manuellement entre deux pills → même rendu via la branche `match[5]`.
5. `bunx tsgo --noEmit` → 0 erreur.
