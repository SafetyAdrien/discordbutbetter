

# Fix: La popup de suppression ne s'affiche pas depuis le menu contextuel

## Problème

Quand on clique sur "Supprimer" dans le menu contextuel (clic droit), le `ContextMenu` Radix se ferme automatiquement avant que l'`AlertDialog` ait le temps de s'ouvrir. Il y a un conflit de focus/portail entre les deux composants Radix.

## Solution

Remplacer `onClick` par `onSelect` avec `e.preventDefault()` sur les `ContextMenuItem` de suppression. Cela empêche le menu contextuel de se fermer automatiquement, puis on ferme manuellement le menu via un micro-délai avant d'ouvrir le dialog.

**`src/components/chat/UniversalMessageContextMenu.tsx`** — lignes 257-265 et 269-277 :

Changer les deux blocs de suppression pour utiliser `onSelect` au lieu de `onClick` :

```tsx
<ContextMenuItem 
  className="text-destructive focus:text-destructive focus:bg-destructive/10" 
  onSelect={(e) => {
    e.preventDefault();
    if (isShiftPressed) {
      onDelete?.();
    } else {
      setTimeout(() => setDeleteOpen(true), 100);
    }
  }}
>
```

Le `setTimeout` de 100ms laisse le temps au `ContextMenu` de se fermer proprement avant d'ouvrir l'`AlertDialog`, évitant le conflit de portail.

