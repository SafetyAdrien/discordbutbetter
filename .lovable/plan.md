

# Correction des contours de focus — approche renforcée

## Problème
La règle CSS actuelle ne fonctionne pas correctement pour deux raisons :
1. Le sélecteur `[class*="focus-visible:ring"]` ne match pas les classes Tailwind compilées (les deux-points sont échappés dans le DOM).
2. Le `MessageInput` utilise `focus-within:border-primary/40` et `focus-within:ring-2` — un pseudo-class différent de `focus-visible`, donc non couvert.

## Solution

**Fichier : `src/index.css`** — Remplacer le bloc actuel (lignes 217-228) par une règle plus robuste :

```css
/* Global focus ring removal */
*:focus, *:focus-visible, *:focus-within {
  outline: none !important;
}
*, *::before, *::after {
  --tw-ring-shadow: 0 0 #0000 !important;
  --tw-ring-offset-shadow: 0 0 #0000 !important;
}
```

Cela écrase les variables Tailwind ring globalement et couvre `focus`, `focus-visible` et `focus-within`.

**Fichier : `src/components/chat/MessageInput.tsx`** (ligne 509) — Retirer `focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10` du className du conteneur input.

**Fichier : `.focus-ring` class** (lignes 447-451) — Supprimer cette classe utilitaire inutilisée ou la vider.

## Fichiers modifiés
- `src/index.css`
- `src/components/chat/MessageInput.tsx`

