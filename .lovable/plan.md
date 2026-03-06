

# Corriger la page blanche DM (Mobile + Desktop)

## Problème

### Mobile
Dans `MobileServersView`, l'état `showDMs` est initialisé à `false` et n'est synchronisé qu'au clic local (`handleDMClick`). Quand `activeDMId` est défini depuis l'extérieur (notification, rechargement), `showDMs` reste `false` → page blanche.

### Desktop
Dans `Index.tsx` (ligne 541-547), le ternaire a un cas `null` implicite : quand `activeServerId` est défini mais `activeServer` n'est pas encore chargé (serveur supprimé, données en transit), rien ne s'affiche → page blanche momentanée.

## Solution

### Fichier 1 : `src/components/mobile/MobileServersView.tsx`
- Initialiser `showDMs` à `!!activeDMId`
- Ajouter un `useEffect` qui synchronise `showDMs = true` quand `activeDMId` devient défini

### Fichier 2 : `src/pages/Index.tsx`
- Ajouter un fallback dans le ternaire desktop : quand `activeServerId` est défini mais `activeServer` n'est pas trouvé, afficher un état de chargement (spinner) au lieu de `null`

```tsx
// Index.tsx — avant
) : null}

// Index.tsx — après  
) : (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
)}
```

