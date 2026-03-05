

# Uniformiser le background de l'icône de bienvenue des salons texte

## Problème

Deux fichiers affichent le message de bienvenue avec des styles d'icône incohérents :

- **`ChatArea.tsx`** (ligne 1030-1031) : L'icône `StreamlineHash` est affichée sans aucun background, juste en `text-muted-foreground`
- **`AnnouncementChannel.tsx`** (ligne 572-573) : L'icône `Hash` est dans un cercle `bg-gradient-gaming` coloré — style différent

## Correction

Uniformiser les deux en ajoutant un **cercle gris légèrement plus foncé** que le fond actuel autour de l'icône, sans changer l'icône elle-même.

### `ChatArea.tsx` (lignes 1030-1031)

Remplacer le `<div>` simple par un conteneur circulaire avec fond gris :

```tsx
// Avant
<div className="mb-4">
  <StreamlineHash size={64} className="text-muted-foreground" />
</div>

// Après
<div className="w-[68px] h-[68px] rounded-full bg-muted flex items-center justify-center mb-4">
  <StreamlineHash size={42} className="text-muted-foreground" />
</div>
```

### `AnnouncementChannel.tsx` (lignes 572-574)

Remplacer le `bg-gradient-gaming` par le même style gris uniforme, et utiliser `StreamlineMegaphone` (l'icône du type announcement) au lieu de `Hash` :

```tsx
// Avant
<div className="w-16 h-16 rounded-full bg-gradient-gaming flex items-center justify-center mb-4">
  <Hash className="w-8 h-8 text-primary-foreground" />
</div>

// Après
<div className="w-[68px] h-[68px] rounded-full bg-muted flex items-center justify-center mb-4">
  <StreamlineMegaphone className="w-10 h-10 text-muted-foreground" />
</div>
```

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/chat/ChatArea.tsx` | Ajouter cercle `bg-muted` autour de `StreamlineHash`, réduire la taille de l'icône |
| `src/components/channels/AnnouncementChannel.tsx` | Remplacer `bg-gradient-gaming` + `Hash` par `bg-muted` + `StreamlineMegaphone` |

