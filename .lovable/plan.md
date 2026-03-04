

# Écran de chargement NexusChat

## Objectif

Remplacer le spinner `Loader2` actuel par un écran de chargement complet et immersif avec :
- Le logo NexusChat (`/pwa-192x192.png`) en spinner animé
- Une phrase de motivation aléatoire
- Des tips & tricks aléatoires
- Attente de toutes les données critiques (auth, serveurs, permissions)

## Plan

### 1. Créer le composant `LoadingScreen`

**Nouveau fichier : `src/components/LoadingScreen.tsx`**

- Logo `/pwa-192x192.png` avec animation pulse/spin douce (CSS keyframe)
- Barre de progression animée (indéterminée ou basée sur les étapes chargées)
- Phrase de motivation aléatoire (pool de ~10 phrases type "Là où les gamers se retrouvent", "Votre communauté vous attend", etc.)
- Tip aléatoire en bas (pool de ~15 tips : "Astuce : Utilisez Ctrl+K pour rechercher", "Maintenez Shift + clic sur Supprimer pour supprimer sans confirmation", "Créez des fils de discussion pour organiser vos conversations", etc.)
- Design cohérent avec le thème dark de l'app (`bg-background`)

### 2. Modifier `Index.tsx` — Utiliser le nouvel écran

- Remplacer le bloc de loading (lignes 390-396) par `<LoadingScreen />`
- Le composant s'affiche tant que `authLoading || (user && serversPending)` est vrai

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/components/LoadingScreen.tsx` | Créer — composant écran de chargement |
| `src/pages/Index.tsx` | Modifier — remplacer le spinner par `<LoadingScreen />` |

