

# Correction banniere double + Integration desktop + Padding salons

## Probleme identifie (Mobile)

La banniere s'affiche en double quand `embedded=true` : le bloc ligne 385-403 ne filtre pas par `embedded`, et le bloc ligne 417-429 l'affiche aussi pour `embedded`. Il faut fusionner ces deux blocs en un seul qui fonctionne dans les deux modes.

## Changements

### 1. Mobile - Supprimer le doublon de banniere

**Fichier** : `src/components/mobile/MobileChannelListView.tsx`

- Fusionner les deux blocs de banniere (lignes 385-403 et 417-429) en un seul bloc conditionnel `{showBanner && bannerUrl && (...)}` qui gere les deux cas (embedded et non-embedded) :
  - Si `!embedded` : afficher le bouton retour
  - Si `embedded` : pas de bouton retour
  - Le nom du serveur et le ServerProfileSheet restent identiques dans les deux cas
- Supprimer le bloc duplique (lignes 417-429)
- Augmenter la hauteur de la banniere de `h-20` a `h-24` pour plus de presence visuelle

### 2. Desktop - Integrer le ChevronDown dans la banniere

**Fichier** : `src/components/layout/ChannelList.tsx`

- Deplacer le bouton `ChevronDown` (menu rapide serveur) a l'interieur du bouton-banniere du header, en position absolue en bas a droite
- Quand la banniere est visible, le ChevronDown apparait en blanc par-dessus l'image
- Quand la banniere est masquee (scroll), le ChevronDown reste dans le header classique
- La banniere prend toute la largeur du header (retirer le gap entre le popover serveur et le menu ChevronDown, fusionner en un seul bloc)

### 3. Padding des salons

**Fichiers** : `MobileChannelListView.tsx` et `ChannelList.tsx`

- Mobile (ligne 441) : changer `px-2` en `px-1` sur le conteneur scrollable des salons
- Desktop (ligne 1351) : changer `px-2` en `px-1` sur le conteneur scrollable
- Desktop orphan channels (ligne 1362) : changer `px-2` en `px-1`

### Resume des fichiers modifies

| Fichier | Changement |
|---|---|
| `MobileChannelListView.tsx` | Fusionner les 2 blocs banniere en 1 ; agrandir la hauteur ; reduire le padding des salons |
| `ChannelList.tsx` | Integrer le ChevronDown dans la zone banniere ; reduire le padding des salons |

