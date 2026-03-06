

# Déplacer l'icône X à droite dans le Sheet Membres mobile

## Changement

Dans `src/components/mobile/MobileChatView.tsx` (lignes 273-281), réorganiser le header du Sheet :
- "Membres" à gauche
- Bouton X à droite avec un espacement minimum

Le `justify-between` est déjà en place, il suffit de sortir le bouton X du groupe gauche et le placer comme élément indépendant à droite.

## Modification

```tsx
// Avant
<div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
  <div className="flex items-center gap-1">
    <SheetClose asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <X className="w-4 h-4" />
      </Button>
    </SheetClose>
    <h3 className="text-sm font-semibold text-foreground">Membres</h3>
  </div>
</div>

// Après
<div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
  <h3 className="text-sm font-semibold text-foreground ml-1">Membres</h3>
  <SheetClose asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8 mr-0.5">
      <X className="w-4 h-4" />
    </Button>
  </SheetClose>
</div>
```

## Fichier modifié (1)
- `src/components/mobile/MobileChatView.tsx`

