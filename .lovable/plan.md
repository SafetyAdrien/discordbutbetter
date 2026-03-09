

# Réduire l'espacement dans la navigation des paramètres serveur (Desktop)

En comparant avec la référence Discord, l'espacement actuel est trop généreux. Deux ajustements dans `renderNavList` de `ServerSettingsModal.tsx` :

## Changements

**Fichier : `src/components/server-settings/ServerSettingsModal.tsx`**

1. **Espacement entre sections** (ligne 130) : `space-y-4` → `space-y-2`
2. **Padding vertical des boutons** (ligne 143) : `py-2` → `py-1` (desktop uniquement)
3. **Taille des icônes conteneurs** (ligne 150-153) : `w-8 h-8` → `w-7 h-7` pour un rendu plus compact
4. **Marge sous les titres de section** (ligne 133) : `mb-1.5` → `mb-1`

Résultat : navigation plus dense et fidèle à la référence Discord.

