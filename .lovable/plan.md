
# Ajouter du spacing aux bords du TabsList dans le modal catégorie

## Changement

Ajouter un padding horizontal (`px-1`) au `TabsList` dans `EditCategoryModal.tsx` pour que les onglets "Aperçu" et "Permissions" aient un léger espacement par rapport aux bords du conteneur.

## Détail technique

### Fichier : `src/components/category-settings/EditCategoryModal.tsx`

Ligne 72 : ajouter `px-1` à la classe du `TabsList` :

```tsx
// Avant
<TabsList className="grid w-full grid-cols-2">

// Après
<TabsList className="grid w-full grid-cols-2 px-1">
```

Un seul changement d'une classe Tailwind.
