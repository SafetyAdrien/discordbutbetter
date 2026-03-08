

# Suppression de l'effet hover sur les inputs

## Analyse

L'`Input` component a `transition-colors duration-200` qui peut causer un léger changement visuel au hover (transition de couleur du navigateur). Il n'y a pas de hover explicite défini, mais la transition rend le changement perceptible.

## Changements

**1. `src/components/ui/input.tsx`** — Supprimer `transition-colors duration-200` et ajouter `hover:border-border hover:bg-input` pour forcer aucun changement au hover.

**2. `src/components/ui/textarea.tsx`** — Même traitement : ajouter des classes hover qui neutralisent tout changement.

**3. `src/index.css`** — Ajouter une règle globale de sécurité :
```css
input:hover, textarea:hover, select:hover {
  /* no visual change on hover */
}
```

2 fichiers composants + 1 fichier CSS modifiés.

