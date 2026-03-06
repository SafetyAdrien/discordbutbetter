

# Ajouter du spacing entre le spine et le conteneur Thread

## Changement — `src/components/chat/ChatArea.tsx` (ligne 1305)

Ajouter `mr-1.5` (6px) au conteneur du spine (`div.flex-shrink-0.w-8.relative`) pour créer un espace entre la fin de la courbe horizontale et le début du conteneur Thread embed.

```tsx
// Avant
<div className="flex-shrink-0 w-8 relative">

// Après
<div className="flex-shrink-0 w-8 relative mr-1.5">
```

Un seul fichier modifié, une seule classe ajoutée.

