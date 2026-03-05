

# Fix: Zones de drag & drop trop larges + direction bidirectionnelle

## Problème

Les seuils actuels (30/70 pour les salons, 25/50/25 pour les catégories) créent des zones trop grandes. Le comportement n'est pas symétrique — il favorise le "after" ce qui rend le drag vers le haut moins réactif.

## Correctif

Revenir à un **seuil 50/50 classique** pour tous les cas, ce qui :
- Rend le drag aussi précis vers le haut que vers le bas
- Réduit la taille de chaque zone (chacune fait exactement la moitié)
- Simplifie la logique

Pour les catégories avec le mode "inside", utiliser un découpage plus serré : **15/70/15** (top 15% = before, middle 70% = inside, bottom 15% = after) pour que les zones before/after soient étroites et précises.

## Changements dans `src/components/layout/ChannelList.tsx`

### Salons (lignes 954-958)
```text
// Avant : seuil à 30% (asymétrique)
const threshold = overRect.top + overRect.height * 0.3;

// Après : seuil à 50% (symétrique, précis dans les deux sens)
const middleY = overRect.top + overRect.height * 0.5;
```

### Catégories — channel → category (lignes 940-952)
```text
// Avant : 25/50/25
const topZone = overRect.top + overRect.height * 0.25;
const bottomZone = overRect.top + overRect.height * 0.75;

// Après : 15/70/15 — zones before/after étroites, "inside" large
const topZone = overRect.top + overRect.height * 0.15;
const bottomZone = overRect.top + overRect.height * 0.85;
```

## Fichier modifié
- `src/components/layout/ChannelList.tsx` — 3 lignes modifiées

