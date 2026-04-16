

# Correctif curseur pour la liste des rôles

## Problème
- La ligne du rôle n'a pas de `cursor-pointer` au survol (sélection)
- Pendant le drag actif, le curseur global ne change pas en `cursor-grabbing`

## Corrections dans `RoleManager.tsx`

### 1. Curseur pointer sur chaque rôle cliquable
Ligne 95 — ajouter `cursor-pointer` à la div principale du `SortableRole` et du `defaultRole` :
```ts
'flex items-center gap-2 px-1 py-1 rounded-lg transition-all duration-150 group cursor-pointer',
```

### 2. Curseur grabbing global pendant le drag
Quand `activeId` est non-null (drag en cours), appliquer `cursor-grabbing` sur le conteneur parent pour forcer le curseur partout :
```tsx
<div className={cn("space-y-0", activeId && "cursor-grabbing")}>
```

## Fichier modifié
- `src/components/server-settings/RoleManager.tsx`

