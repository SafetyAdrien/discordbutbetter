## Lecture seule — réponses aux 2 points

### 1. Espace entre deux pills couleur consécutifs (picker / autocomplete `<`)

`handleMentionSelect` (`MessageInput.tsx:526-567`) construit :

```ts
const after = value.slice(end).replace(/^[ \t]+/, '');
const newValue = before + inserted + ' ' + after;
```

→ Un **espace réel** ` ` est systématiquement ajouté après chaque
insertion via le picker `<`. Deux pills consécutifs insérés via
l'autocomplete donnent donc `■ White ■ White` avec **un vrai U+0020
entre eux**. Caret final positionné `start + inserted.length + 1`
(après l'espace).

Note hors scope : le bouton Palette → "Insérer" (`insertColor`,
`MessageInput.tsx:307-325`) n'ajoute **pas** d'espace de séparation.
Pas concerné par la question, mais signalé.

### 2. Ordre actuel des box-shadow sur le pill couleur

`InputMarkdownOverlay.tsx` ligne 169 (`renderMentionEntry`, kind
'color') et ligne 252 (`renderLegacyAndSpecialMentions`, branche
`match[5]`) :

```ts
boxShadow: `${sideShadow(bg)}, 0 0 0 1px hsl(var(--border) / 0.65)`
```

→ **sideShadow d'abord, puis le ring de bordure** dans la même
propriété `boxShadow`. C'est exactement la collision décrite : les
deux côtés horizontaux du ring sont masqués par les deux ombres pleine
couleur de `sideShadow` (qui dépassent de 2px latéralement), donc le
ring n'est visible qu'en haut et en bas.

---

## Fix — bordure via `outline` au lieu de `box-shadow`

Aucun changement nécessaire côté insertion (point 1 OK pour le picker).
Une seule modification, appliquée aux **deux endroits** :

### Touchpoint unique : `src/components/chat/InputMarkdownOverlay.tsx`

**Ligne 169** (`renderMentionEntry`, kind === 'color') :

```tsx
// avant
style={{ backgroundColor: bg, boxShadow: `${sideShadow(bg)}, 0 0 0 1px hsl(var(--border) / 0.65)` }}

// après
style={{
  backgroundColor: bg,
  boxShadow: sideShadow(bg),
  outline: '1px solid hsl(var(--border) / 0.65)',
  outlineOffset: '0px',
}}
```

**Lignes 247-256** (`renderLegacyAndSpecialMentions`, branche
`match[5]`) : même substitution sur le `style` du `<span>` pill.

Pourquoi `outline` :
- couche de rendu séparée de `box-shadow`, aucun empilement avec
  `sideShadow` → les 4 côtés sont visibles uniformément ;
- `outline` ne participe pas au box model → la largeur de boîte ne
  change pas, donc l'alignement caret/overlay reste intact ;
- `outline-offset: 0` colle l'outline pile sur le bord visuel du pill
  (qui inclut déjà les 2px de `sideShadow` à gauche/droite).

### Hors scope explicitement

- `insertColor` (bouton Palette) : pas touché, la question 1 ciblait
  uniquement le picker `<`.
- Aucun autre pill (mention, role, channel) n'utilise actuellement de
  ring border → rien à modifier sur eux.

---

## Vérification (après bascule en build mode)

1. Préview localhost:8080, hard reload + purge SW/caches.
2. Insérer deux pills via picker `<` consécutivement → screenshot
   `1_two_pills_outline.png` : bordure visible **uniformément sur les
   4 côtés** des deux pills, vrai espace entre eux (pas de
   soulignement orthographique rouge).
3. Cliquer juste avant puis juste après un pill → caret pile au bord
   visuel (pas de décalage de 1-2px).
4. Taper `<c:#ff0000>` manuellement entre deux pills → même rendu
   uniforme via la branche `match[5]`.
5. `bunx tsgo --noEmit` → 0 erreur.
