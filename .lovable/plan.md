## Goal

Aligner le rendu des blocs de code dans les **messages** sur le style du conteneur de saisie : une seule boîte sombre arrondie, avec une icône **Copier** en haut à droite. Pas de barre d'en-tête avec le langage.

## Change — `src/components/ui/code-block.tsx`

Refactor `CodeBlock` :

- Supprimer l'en-tête (`<div>` avec nom de langue + bouton).
- Wrapper unique : `<pre class="group relative">` avec
  - `background: hsl(var(--surface-elevated))`
  - `box-shadow: inset 0 0 0 1px hsl(var(--border) / 0.4)`
  - `rounded-[4px]`
  - `my-2 overflow-hidden`
- `<code>` à l'intérieur : `block px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre`. Garder la coloration syntaxique via highlight.js.
- Bouton copier flottant en absolu `top-1.5 right-1.5`, taille 24×24, `rounded-[3px]`, fond `bg-background/60`, icône lucide `Copy`/`Check` 14 px, `text-muted-foreground hover:text-foreground`. Visible en permanence (pas masqué via `opacity-0 group-hover:opacity-100`) pour rester cohérent avec l'overlay de saisie.
- Le bouton copie uniquement `code` brut (déjà le cas) — sans les `` ``` ``.
- Conserver tout l'enregistrement highlight.js existant.

## Optionnel

Aucun autre fichier touché. Le rendu inline `<code>` (backticks simples) reste inchangé.

## Validation

- Envoyer `` ```js\nconsole.log(1)\n``` `` → une seule boîte arrondie sombre, icône copier en haut à droite, pas de bandeau de langue.
- Clic sur icône → `console.log(1)` est copié, l'icône devient `Check` 2 s.
- Visuellement cohérent avec le bloc rendu dans la zone de saisie.