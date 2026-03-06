

# Supprimer l'icône de recherche du header mobile

## Changement

Dans `src/components/mobile/MobileChatView.tsx`, supprimer le bloc Search (lignes 170-176) du header des salons.

```tsx
// Supprimer ce bloc :
{/* Search */}
<button
  onClick={() => setShowSearch(true)}
  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
>
  <Search className="w-4 h-4" />
</button>
```

## Fichier modifié (1)
- `src/components/mobile/MobileChatView.tsx`

