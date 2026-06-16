## Goal

1. Compléter le rendu markdown live dans le composer pour les formats restants.
2. Corriger la dérive du curseur (caret au milieu d'un mot alors qu'il est en fin) causée par `font-bold`, `italic` et `font-mono` qui modifient la largeur des glyphes par rapport au textarea.

## Cause de la dérive du curseur

Le textarea utilise toujours `font-weight: 400`, `font-style: normal`, `gg sans`. L'overlay, lui, applique `font-bold`, `italic` ou `font-mono` sur le texte intérieur des délimiteurs. Ces propriétés **changent la largeur des glyphes**, donc l'overlay et le textarea ne sont plus alignés caractère par caractère → le curseur visuel paraît décalé (image 1 et 2).

Règle stricte (déjà documentée en haut du fichier) : aucune variation de `font-weight`, `font-style`, ni `font-family` ne doit affecter la **largeur de mise en page**.

## Plan

Fichier unique : `src/components/chat/InputMarkdownOverlay.tsx`.

### 1. Reproduire le gras sans changer la largeur

Remplacer `font-bold` par un faux gras via `text-shadow`, qui ne change pas la métrique :

```tsx
<span style={{ textShadow: '0.6px 0 0 currentColor, -0.6px 0 0 currentColor' }}>
  {match[2]}
</span>
```

### 2. Reproduire l'italique sans changer la largeur

Remplacer `italic` par `transform: skewX(-10deg); display: inline-block;` — `transform` n'affecte pas le layout, donc la largeur reste identique au textarea, mais le texte (et le curseur visuel sous la lettre) paraît penché.

```tsx
<span style={{ transform: 'skewX(-10deg)', display: 'inline-block' }}>
  {match[9]}
</span>
```

### 3. Inline code : retirer `font-mono`

`font-mono` change drastiquement la largeur des glyphes → suppression. On garde uniquement la couleur + background pour distinguer visuellement le code en ligne (comme actuellement, mais sans la police monospace).

### 4. Spoiler

Déjà rendu, on conserve mais on garantit qu'aucun `font-*` n'est utilisé : juste un `bg-muted/50 rounded-[3px]` sur le texte intérieur, délimiteurs en `text-muted-foreground/50`. Aucun changement de métrique.

### 5. Listes à puces et numérotées

Déjà parsées (`listItem`, `orderedListItem`) mais sans rendu visuel particulier. Ajouter une coloration du marqueur uniquement (le `-`, `*` ou `1.`) en `text-muted-foreground/70`, le reste du texte normal. **Aucun changement de marge/indentation** — sinon dérive.

Implémentation : détecter le préfixe dans `renderInlineMarkdown` au niveau de la ligne pour les types `listItem` / `orderedListItem`, l'envelopper d'un span coloré, puis passer le reste de la ligne dans le rendu inline existant.

### 6. Listes de tâches `- [ ]` / `- [x]`

Ajouter un nouveau type de ligne `taskItem` dans `OverlayLine['type']` et dans `parseLines` / `getLineTypeAtCursor` :

- regex : `/^(\s*)[-*] \[( |x)\] /`
- rendu : marqueur `- [ ]` ou `- [x]` en `text-muted-foreground/70`, et si coché : strikethrough sur le reste de la ligne (via `text-decoration: line-through` — n'affecte pas la largeur).

### 7. Bloc de code (` ``` `)

Déjà rendu comme `codeBlockDelimiter` / `codeBlockLine` avec la classe `discord-overlay-code`. Vérifier dans `index.css` que cette classe **n'applique pas** `font-family: monospace` (car cela décalerait le curseur). Si elle le fait, retirer `font-family` et garder seulement `background`/`color`. (Lecture du CSS au moment du build pour confirmer.)

### 8. Sanity check global

À la fin, le fichier ne doit plus contenir aucune occurrence de :
- `font-bold`
- `font-mono`
- `italic` (classe Tailwind ou `font-style: italic`)

Tous remplacés par `text-shadow` / `transform: skewX` / couleur+background.

## Validation

- Taper `**Test**` → "Test" apparaît visuellement gras, curseur **exactement** à la fin du mot.
- Taper `*Test*` / `_Test_` → texte penché, curseur en fin de mot.
- Taper `` `Code en ligne` `` → fond coloré, **même police** que le reste, curseur aligné.
- Taper `- [ ] Tâche` puis cocher `- [x] Tâche` → marqueur grisé, texte barré quand coché.
- Taper `1. Item` ou `- Item` → marqueur grisé, texte normal.
- Mélange `**gras** *italique* ` `code` ` ||spoiler||` sur la même ligne → tous les curseurs restent alignés.
- Aucun changement attendu sur l'envoi : le markdown brut est inchangé.
