

## Plan: Badge vocal sur l'icône serveur + tooltip horizontal compact

### 1. Badge vocal sur l'icône du serveur
**Fichier**: `src/components/layout/ServerList.tsx`

Ajouter un petit badge en haut à droite de l'icône serveur (similaire au badge mention mais en haut-droite) quand `voiceParticipants.length > 0`:
- Icône `Volume2` de 10px dans un cercle vert/emerald
- Position: `absolute -top-1 -right-1`
- Border de 2px couleur sidebar (comme le badge mention)

### 2. Refaire le tooltip en ligne horizontale
**Fichier**: `src/components/layout/ServerList.tsx`

Remplacer la liste verticale actuelle (lignes 159-184) par un layout horizontal compact:
- Une seule ligne: `🔊 [avatar1] [avatar2] [avatar3] +N`
- Avatars en stack overlap (margin-left négatif) style Discord
- Le `+N` s'affiche si > 3 participants
- Pas de noms textuels, juste les avatars + compteur

```text
┌──────────────────────────┐
│ Mon Serveur              │
│ 🔊 (●)(●)(●) +2 en vocal │
└──────────────────────────┘
```

### Fichiers modifiés
- `src/components/layout/ServerList.tsx` (badge + tooltip)

