

# Supprimer toutes les références à `font-display` (Orbitron)

## Problème

La police `Orbitron` (mappée sur la classe `font-display`) est encore utilisée dans 4 fichiers composants et importée dans `src/index.css`. Cette police n'a jamais été demandée — tous les titres doivent utiliser `font-ginto` (gg sans).

## Changements

### 1. Remplacer `font-display` → `font-ginto` dans 4 fichiers

| Fichier | Occurrences |
|---|---|
| `src/components/modals/DiscoverModal.tsx` | 2 (`font-display` lignes 49, 88) |
| `src/components/modals/CreateServerModal.tsx` | 3 (lignes 163, 172, 181) |
| `src/components/modals/JoinServerModal.tsx` | 1 (ligne 73) |
| `src/components/channels/AnnouncementChannel.tsx` | 1 (ligne 575) |

Chaque `font-display` → `font-ginto`.

### 2. Nettoyer l'import et la config Orbitron

- **`src/index.css`** (ligne 1) : Retirer `family=Orbitron:wght@400;500;600;700` de l'import Google Fonts
- **`tailwind.config.ts`** (ligne 29) : Supprimer la ligne `display: ['Orbitron', 'system-ui', 'sans-serif'],`

## Fichiers modifiés
- `src/components/modals/DiscoverModal.tsx`
- `src/components/modals/CreateServerModal.tsx`
- `src/components/modals/JoinServerModal.tsx`
- `src/components/channels/AnnouncementChannel.tsx`
- `src/index.css`
- `tailwind.config.ts`

