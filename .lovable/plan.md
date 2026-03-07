

# Toggle Plein écran / Split view pour le ThreadView

## Résumé

Ajouter une option dans le menu "..." (DropdownMenu) du header du ThreadView pour basculer entre le mode "Split view" (actuel, 60/40) et "Plein écran" (le thread prend toute la largeur, le chat est masqué).

## Changements

### 1. `src/hooks/useNavigationState.ts`
- Ajouter `threadFullscreen: boolean` au state persisté (défaut `false`)
- Ajouter `setThreadFullscreen` setter

### 2. `src/components/threads/ThreadView.tsx`
- Nouveau prop : `isFullscreen?: boolean`, `onToggleFullscreen?: () => void`
- Dans le `DropdownMenuContent` (lignes 468-476), ajouter un item avant "Supprimer" :
  - Icône `Maximize2` / `Minimize2` selon l'état
  - Texte "Plein écran" ou "Vue partagée"
  - Appelle `onToggleFullscreen`

### 3. `src/pages/Index.tsx`
- Lire `threadFullscreen` / `setThreadFullscreen` depuis `useNavigationState`
- Ligne ~674 : quand `threadFullscreen` est `true`, masquer le `<div>` contenant le chat (ajouter `hidden`)
- Ligne ~679 : changer `flex-[4]` en `flex-1` quand fullscreen
- Passer `isFullscreen` et `onToggleFullscreen` au composant `<ThreadView>`

