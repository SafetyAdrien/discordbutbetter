## Partie A — Bannière Apparence : composition propre

Objectif : arrêter les images « collées à la va-vite ». Chaque moment garde 3 calques mais avec un cadrage propre, des ombres épaisses et une découpe de la layer du dessous.

### 1. Re-capturer proprement les 9 vignettes
Ré-exécuter Playwright et remplacer les fichiers actuels dans `src/assets/appearance-banner/` par des captures ciblées (screenshot d'élément, pas de crop viewport), ce qui garantit des bords propres :

- Moment 1 (Vue serveur) :
  - `m1-back` = screenshot élément du panneau central (chat area) — pas de barre serveur qui déborde
  - `m1-front-a` = screenshot élément de la liste de salons uniquement
  - `m1-front-b` = screenshot élément de la member list uniquement
- Moment 2 (Réglages) :
  - `m2-back` = screenshot élément de `.modal` cadré serré (sans le fond obscurci)
  - `m2-front-a` = screenshot élément des 2 tuiles thème (Sombre + Clair) une fois le thème clair activé
  - `m2-front-b` = screenshot élément d'une carte de zone typographie complète
- Moment 3 (Typographie) :
  - `m3-back` = screenshot élément de la section Typographie entière
  - `m3-front-a` = screenshot élément du bloc Aperçu en direct
  - `m3-front-b` = screenshot élément d'une ligne de zone (label + AG/ag/Ag/Aa)

### 2. Refonte de `AppearancePreviewBanner.tsx`

Composition en cascade avec règles strictes :

```text
+-----------------------------------------------+
|   [ back (large, angle léger) ]               |
|        \                                      |
|         \____[ frontA (offset centre) ]___    |
|                          \                    |
|                           \__[ frontB ]__     |
+-----------------------------------------------+
```

Règles visuelles par calque :
- `border-radius: 12px`, `overflow: hidden`
- `object-fit: cover`, `object-position: top left` — pour éviter tout étirement
- Anneau clair 1px : `outline: 1px solid hsl(var(--border))` (remplace le `ring` qui rendait sale)
- **Ombre portée épaisse 5px** demandée (sur les calques front) :
  - `box-shadow: 0 5px 0 0 hsl(var(--background)), 0 5px 24px -4px rgba(0,0,0,.55)`
  - La première stop crée un "socle" plein de 5px qui « détoure » proprement le calque du dessous en cachant la jointure — c'est le montage propre demandé.
- **Découpe du calque du dessous** : appliquer un `clip-path` (ou `mask-image` en dégradé) au calque immédiatement inférieur, dans la zone où le calque supérieur le chevauche, pour supprimer la partie cachée. Approche retenue : `mask-image` en composite avec un `radial-gradient` positionné exactement sur la bbox du front → produit un « trou » net + fondu 12px de sécurité. Fallback sans `mask-composite` : superposer un `<div>` de la même couleur que le fond de la bannière avec le border-radius du front + l'ombre 5px, ce qui simule la découpe.
- Angles doux : `transform: perspective(1600px) rotateY(4deg) rotateX(0.5deg)` (moitié moins que la version actuelle → plus propre).

Transition entre moments : garder le crossfade opacity 900ms + désactivé si `prefers-reduced-motion`.

## Partie B — Thème clair complet + transition

### 1. Palette claire complète dans `src/index.css`

Le bloc `.dark` actuel ne fait rien (les valeurs sont dupliquées de `:root`). Restructuration :

- Déplacer **toutes** les variables actuelles de `:root` (background, foreground, card, popover, primary, muted, accent, destructive, alerts, borders, surfaces `surface-1/2/3`, sidebar, user-panel, shadows, gradients, status colors…) dans `.dark { … }`.
- Ajouter un bloc `:root { … }` (thème clair par défaut) avec la palette équivalente, valeurs miroir :

Exemples de valeurs claires cohérentes (à appliquer sur **toutes** les variables) :
- `--background: 220 20% 98%`
- `--foreground: 225 25% 12%`
- `--card: 0 0% 100%`
- `--popover: 0 0% 100%`
- `--muted: 220 14% 94%`
- `--muted-foreground: 225 12% 40%`
- `--border: 220 14% 88%`
- `--input: 220 14% 96%`
- `--surface-server-list: 220 16% 92%`
- `--surface-1: 220 18% 96%`
- `--surface-2: 0 0% 100%`
- `--surface-3: 220 14% 94%`
- `--surface-header: 220 16% 92%`
- `--surface-hover: 220 14% 90%`
- `--user-panel: 220 16% 92%`
- `--sidebar-*` : miroir clair
- `--gradient-surface: linear-gradient(180deg, hsl(0 0% 100%), hsl(220 18% 96%))`
- `--shadow-card: 0 4px 20px hsl(225 25% 12% / 0.08)`
- `--shadow-elevation-1/2/3` : opacités abaissées (0.06 / 0.08 / 0.12)
- `--poll-background: 220 14% 94%`
- Statuts inchangés (accessibles dans les deux thèmes)

Le highlight.js (l.711) et les autres blocs `.dark`-only éventuels sont vérifiés pour ne pas casser en clair.

### 2. Activer la tuile "Clair" dans `AppearanceSettings.tsx`
- `available: true`
- Retirer le texte « Bientôt disponible… », mettre : « Palette claire lumineuse et lisible. »
- Débloquer le `disabled` et l'`opacity-50`.

### 3. Transition douce sans défaut

Ajouter dans `src/index.css`, dans `@layer base`, une transition ciblée sur les propriétés colorimétriques (jamais sur `all`, ce qui casserait les animations existantes) :

```css
html.theme-transition,
html.theme-transition *,
html.theme-transition *::before,
html.theme-transition *::after {
  transition:
    background-color 320ms ease,
    color 320ms ease,
    border-color 320ms ease,
    fill 320ms ease,
    stroke 320ms ease,
    box-shadow 320ms ease !important;
}
```

Modification de `ThemeContext.tsx` :
- Dans `applyThemeClass`, avant `classList.toggle('dark', …)`, faire :
  1. `root.classList.add('theme-transition')`
  2. Toggle du thème
  3. `setTimeout(() => root.classList.remove('theme-transition'), 360)`
- La classe temporaire garantit que **seule** la bascule de thème déclenche la transition (pas de coût runtime permanent, pas d'interaction avec les hovers/anim).
- Respect de `prefers-reduced-motion` : short-circuit à 0ms (pas d'ajout de la classe).

Vérification que `applyThemeClass` gère correctement `colorScheme` en clair (`root.style.colorScheme = 'light'`) pour que les scrollbars/formulaires natifs suivent.

## Fichiers touchés

- `src/assets/appearance-banner/*.png` — 9 fichiers remplacés par des captures propres
- `src/components/appearance/AppearancePreviewBanner.tsx` — composition, ombres 5px, découpe
- `src/index.css` — palette claire complète + classe `theme-transition`
- `src/contexts/ThemeContext.tsx` — ajout/retrait de la classe `theme-transition` autour du switch
- `src/components/account-settings/AppearanceSettings.tsx` — activation de la tuile Clair

## Ce qui n'est pas touché

- Aucun composant métier n'est modifié : le thème clair fonctionne uniquement via les tokens sémantiques existants (aucun composant n'utilise `text-white` / `bg-black` hardcodés dans nos règles).
- Le système de typographie des catégories, la logique d'ouverture du modal, la synchro Supabase des préférences UI restent inchangés.
