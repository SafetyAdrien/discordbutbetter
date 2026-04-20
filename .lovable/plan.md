

## Problème

Erreur Vite bloquante :
```
Failed to resolve import "@radix-ui/react-portal" from "src/components/profile/UserProfilePopup.tsx"
```

Le package `@radix-ui/react-portal` n'est pas installé dans le projet. Il a été importé en ligne 23 de `UserProfilePopup.tsx` puis utilisé une seule fois (ligne 592) sous la forme `<Portal.Root>…</Portal.Root>` pour wrapper la carte de profil en mode `card`.

## Cause

Lors d'une itération précédente, l'import `import * as Portal from '@radix-ui/react-portal'` a été ajouté sans installer la dépendance correspondante. Tous les autres composants overlay utilisés dans le projet (`Dialog`, `Drawer`, `Popover`, `Tooltip`) embarquent déjà leur propre Portal via `@radix-ui/react-*`, donc cette dépendance directe n'a jamais été nécessaire.

## Solution (la plus simple, zéro nouvelle dépendance)

Remplacer `Portal.Root` par le primitive natif de React `createPortal` (déjà disponible via `react-dom`, déjà installé). Comportement identique : le contenu est monté dans `document.body`.

### Changements dans `src/components/profile/UserProfilePopup.tsx`

1. **Ligne 23** — supprimer :
   ```ts
   import * as Portal from '@radix-ui/react-portal';
   ```
   et ajouter :
   ```ts
   import { createPortal } from 'react-dom';
   ```

2. **Lignes 590–617** — remplacer le wrapper `<Portal.Root>…</Portal.Root>` par un appel à `createPortal(…, document.body)` :
   ```tsx
   return (
     <>
       {createPortal(
         <div className="fixed inset-0 z-50">
           …contenu existant inchangé…
         </div>,
         document.body
       )}
       {serverProfileModal}
     </>
   );
   ```

Aucune logique métier modifiée — uniquement le mécanisme de portail.

## Garantie « ne casse rien »

- Le rendu visuel et la position de la carte (`cardPosition`) restent identiques (toujours dans `document.body`, `position: fixed`).
- Aucun autre fichier n'importe `@radix-ui/react-portal` (vérifié).
- Pas de nouvelle dépendance, pas de migration SQL, pas de modification d'API.

## Fichier modifié

- `src/components/profile/UserProfilePopup.tsx` (1 import remplacé + 1 wrapper de rendu remplacé par `createPortal`)

