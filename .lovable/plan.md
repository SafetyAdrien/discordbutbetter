

# Suppression globale des contours de focus

## Problème
Des contours colorés (focus rings) apparaissent sur les barres de recherche, inputs de chat, modaux, boutons, etc. lors du focus clavier.

## Solution
Ajouter une règle CSS globale dans `src/index.css` qui supprime tous les focus rings (`ring`, `outline`) sur tous les éléments interactifs. Cela couvre les 12+ fichiers UI qui utilisent `focus-visible:ring-2 focus-visible:ring-ring` sans avoir à les modifier un par un.

### `src/index.css`
Ajouter dans la couche `@layer base` :
```css
*:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  ring-color: transparent !important;
}

/* Tailwind ring utilities override */
.ring-ring, [class*="focus-visible:ring"], [class*="focus:ring"] {
  --tw-ring-color: transparent !important;
  --tw-ring-offset-color: transparent !important;
  --tw-ring-shadow: 0 0 #0000 !important;
  --tw-ring-offset-shadow: 0 0 #0000 !important;
}
```

Ceci neutralise tous les focus rings en une seule règle, y compris ceux des composants Radix UI (dialog, tabs, switch, checkbox, select, slider, etc.).

### Fichier modifié
- `src/index.css`

