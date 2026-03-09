

# Supprimer l'animation des icônes de serveurs

## Problème
La classe `.server-icon` dans `src/index.css` a `transition: all 300ms cubic-bezier(0.2, 0, 0, 1)` qui anime le changement de forme (rond → carré arrondi) au hover et à l'activation. L'utilisateur veut que ce changement soit instantané.

## Changement

**Fichier : `src/index.css`** (ligne 299)
- Remplacer `transition: all 300ms cubic-bezier(0.2, 0, 0, 1)` par `transition: none` sur `.server-icon`

Également supprimer les `transition: height 300ms` sur les indicateurs pill dans `ServerList.tsx` (lignes 127, 462, 469) pour cohérence — les pills changeront de taille instantanément aussi.

2 fichiers modifiés.

