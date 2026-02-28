

# Correctifs Mobile : Hauteur ecran et bouton flottant

## Probleme 1 : Hauteur de l'interface mobile

L'application utilise `h-screen` (100vh) dans `MobileLayout.tsx` (ligne 261). Sur iOS et Android, `100vh` ne correspond pas a la hauteur reelle visible du navigateur car les barres d'adresse et de navigation du systeme sont ignorees. Le contenu depasse et est coupe en bas.

### Solution
Remplacer `h-screen` par `h-dvh` (dynamic viewport height) avec un fallback CSS pour les navigateurs qui ne supportent pas encore `dvh`. Le `dvh` s'adapte dynamiquement quand la barre d'adresse du navigateur apparait/disparait.

**Fichier** : `src/components/mobile/MobileLayout.tsx`
- Ligne 261 : remplacer `h-screen` par `h-[100dvh]`

**Fichier** : `src/index.css`
- Ajouter un fallback CSS qui definit `h-[100dvh]` comme `100vh` pour les navigateurs ne supportant pas `dvh`, puis `100dvh` via `@supports`

## Probleme 2 : Bouton flottant (FAB) dans les DMs

Le FAB "Nouveau message" dans `MobileHomeView.tsx` (ligne 113-118) utilise `absolute bottom-20 right-4` ce qui le positionne de facon fixe a 80px du bas. Ce positionnement ne prend pas en compte la hauteur reelle de la bottom nav ni le safe area inset sur iOS.

### Solution
Remplacer le positionnement `absolute bottom-20` par un positionnement qui respecte le safe area : `fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))]`. Utiliser `fixed` au lieu de `absolute` pour qu'il reste toujours visible meme quand la liste de DMs scrolle.

**Fichier** : `src/components/mobile/MobileHomeView.tsx`
- Ligne 113-118 : changer les classes du bouton FAB de `absolute bottom-20` a `fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))]`

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/mobile/MobileLayout.tsx` | `h-screen` remplace par `h-[100dvh]` |
| `src/index.css` | Ajout du fallback CSS pour `dvh` |
| `src/components/mobile/MobileHomeView.tsx` | FAB repositionne avec `fixed` + safe area |

