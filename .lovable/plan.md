
# Augmenter la visibilite des noms de salons dans la sidebar

## Probleme

Les icones d'action (invitation + parametres) a droite du nom de salon utilisent `opacity-0` au repos. Elles restent dans le flux CSS et reservent de l'espace, ce qui reduit la zone de texte et provoque une troncature prematuree du nom (ex: "Aide & Cons..." au lieu de "Aide & Consultations").

## Solution

Remplacer `opacity-0 group-hover:opacity-100` par `hidden group-hover:flex` sur le conteneur des icones d'action. Ainsi, les icones ne prennent aucune place au repos et le nom du salon dispose de toute la largeur disponible. Au survol, les icones apparaissent normalement.

## Fichier a modifier

### `src/components/layout/ChannelList.tsx` (ligne 485)

Changer:
```
<div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-[5px]">
```
En:
```
<div className="hidden group-hover:flex gap-[5px]">
```

## Impact

- Les noms de salons seront visibles sur toute la largeur disponible au repos
- Au survol, les icones apparaitront comme avant (avec un leger changement : pas de transition d'opacite, apparition directe)
- Aucun changement de fonctionnalite
