
# Ajouter une marge laterale aux boutons de salons

## Changement

Ajouter un petit espacement horizontal (padding gauche/droite) au conteneur de la liste des salons pour que les boutons ne soient pas colles aux bords.

## Details techniques

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

**Ligne 303** - Ajouter `px-2` au conteneur de la liste des salons :

```
// Avant
<div className="flex-1 overflow-y-auto py-2">

// Apres
<div className="flex-1 overflow-y-auto py-2 px-2">
```

### Fichier : `src/components/layout/ChannelList.tsx`

Appliquer le meme espacement au conteneur desktop si necessaire, pour garder la coherence.

Un seul changement CSS, aucun impact fonctionnel.
