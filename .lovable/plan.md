## Goal

1. Dans le `InputMarkdownOverlay`, regrouper visuellement chaque bloc ```` ``` … ``` ```` en **une seule boîte** (fond + bordure + radius), avec un **bouton copier** en haut à droite. Le bouton copie uniquement le contenu intérieur, sans les `` ``` ``.
2. Corriger les sauts de curseur restants entre caractères.

## Changes — `src/components/chat/InputMarkdownOverlay.tsx`

### A. Regroupement des lignes en blocs de code

Aujourd'hui chaque ligne (`codeBlockDelimiter`, `codeBlockLine`) reçoit son propre fond via `.discord-overlay-code::before`, donc on voit 3 boîtes empilées au lieu d'une.

- Dans le rendu final (la boucle `lines.map`), grouper les lignes consécutives appartenant au même bloc : ouverture ```` ``` ````, lignes internes, fermeture ```` ``` ````.
- Rendre chaque groupe dans un wrapper `<div>` unique avec:
  - `bg-surface-elevated rounded-[4px] border border-border/40`
  - `relative` pour positionner le bouton copier
  - chaque ligne intérieure conserve sa hauteur de ligne (pour rester alignée avec le textarea sous-jacent — règle non négociable)
- Supprimer `.discord-overlay-code` de `lineStyles` (plus de `::before` par ligne) → 1 seule boîte au lieu de N.

### B. Bouton copier

- En haut à droite du wrapper du bloc : icône `Copy` (lucide), `pointer-events-auto` (l'overlay parent est `pointer-events-none`, on ré-active uniquement sur ce bouton).
- Au clic, écrit dans le presse-papier la concaténation des `codeBlockLine` du groupe (sans les délimiteurs ```` ``` ````, sans le langage éventuel `js`, etc.). Utilise `navigator.clipboard.writeText`.
- État visuel "copié" 1.5 s (icône `Check`) — purement local au composant.
- Positionnement absolu, `top-1 right-1`, taille fixe (24×24), ne perturbe pas la métrique du texte (positionné hors flux).

### C. Défilement interne

Contrainte technique : l'overlay doit rester **caractère-par-caractère aligné** avec le `<textarea>` en dessous. Le textarea retourne à la ligne automatiquement — on ne peut pas appliquer un vrai `overflow-x: auto` au bloc dans l'overlay sans casser l'alignement du curseur.

Approche retenue :
- Pas de scroll horizontal réel dans l'overlay (les lignes restent wrap comme dans le textarea).
- On garde simplement le fond visuel englobant. Si l'utilisateur veut un scroll horizontal, ce sera dans le rendu final du message (déjà géré par `MarkdownPreview`), pas dans la saisie. Comportement documenté en commentaire dans le code.

### D. Correction du curseur qui saute entre caractères

Cause identifiée : le `display: inline-block` + `transform: skewX(-10deg)` sur les italiques (matches `*…*` et `_…_`) modifie la façon dont le segment s'inline et change le point de césure de ligne par rapport au `<textarea>`. Les `textShadow` pour le gras restent neutres.

Corrections :
- Retirer `display: inline-block` sur les italiques. Garder uniquement `transform: skewX(-10deg)` n'est pas possible sur un `<span>` inline — donc remplacer l'effet italique par un effet visuel sans transform ni font: une légère couleur + soulignement très atténué n'est pas idéal. À la place, utiliser `font-style: italic` MAIS forcer `font-synthesis-style: none` et `font-feature-settings: normal` au niveau du conteneur racine, puisque la police « gg sans » n'a pas de variante italique → le navigateur n'ajoutera aucune synthèse de largeur. Vérifié : avec `font-synthesis: none` déjà présent sur le wrapper, `italic` n'altère pas les avances de glyphe pour les polices sans italique réel.
- Ajouter explicitement `font-synthesis: none` aussi sur le `<textarea>` (`MessageInput.tsx`) pour garantir la symétrie.
- Garder `text-shadow` pour le gras (sans changement de largeur).
- S'assurer que **tous** les `<span>` enfants héritent exactement de la même `font-family`, `font-weight: 400`, `letter-spacing: normal`, `font-variant-numeric: tabular-nums`. Pas de classes `font-mono` nulle part dans l'overlay.
- Le wrapper du bloc de code (nouveau `<div>` avec `border`) ne doit pas ajouter de padding horizontal qui décalerait le texte. La bordure est placée via `box-shadow inset` (ne consomme pas de place dans le flux) plutôt que `border` (qui consomme 1 px).

## Changes — `src/components/chat/MessageInput.tsx`

- Ajouter `fontSynthesis: 'none'` au style inline du `<textarea>` pour matcher l'overlay.

## Changes — `src/index.css`

- Supprimer la règle `.discord-overlay-code` / `::before` (plus utilisée, remplacée par le wrapper React).

## Validation

- Taper `` ```\ncode line 1\ncode line 2\n``` `` → une seule boîte englobante, copier copie `code line 1\ncode line 2`.
- Taper `*italic*` et placer le curseur à la fin du mot → curseur exactement à la fin, plus aucun saut.
- Combinaison `**bold** *italic* \`code\`` sur une ligne → curseur aligné à chaque position.
- Le textarea et l'overlay restent parfaitement superposés (test visuel en sélectionnant le texte du textarea).