

## Plan : Modifier les couleurs du panneau vocal et de l'icône vocale serveur

### 1. Boutons du panneau vocal (`VoiceControls.tsx`)
Changer le fond du conteneur des contrôles vocaux de `bg-[hsl(var(--online))]/10` vers `bg-[#e0e0e3]` (converti en HSL Tailwind : `bg-[#e0e0e3]`). Tailwind supporte directement les hex arbitraires.

**Ligne 48** : Remplacer `bg-[hsl(var(--online))]/10` par `bg-[#e0e0e3]` et adapter `border-[hsl(var(--online))]/20` vers `border-[#c8c8cb]` pour cohérence.

### 2. Icône vocale dans la sidebar serveur (`ServerList.tsx`)
Le badge vocal sur les icônes serveur (petit cercle vert avec `Volume2`) :
- Fond : gris foncé (`bg-[#4a4a4d]`) au lieu de `bg-emerald-500`
- Icône : déjà blanche (`text-white`), pas de changement nécessaire

**Ligne ~147** : Remplacer `bg-emerald-500` par `bg-[#4a4a4d]`.

### Fichiers modifiés
- `src/components/layout/VoiceControls.tsx` (ligne 48 : couleur de fond)
- `src/components/layout/ServerList.tsx` (ligne ~147 : badge vocal)

