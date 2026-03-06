

# Fix: Drag & Drop des rôles ne fonctionne pas

## Cause

Dans `SortableRole` (ligne 104-118 de `RoleManager.tsx`), la poignée de drag a ce code :

```tsx
<div
  ref={setActivatorNodeRef}
  {...(isDisabled ? {} : { ...attributes, ...listeners })}  // ← listeners contient onPointerDown
  onPointerDown={(e) => { e.stopPropagation(); }}            // ← ÉCRASE le onPointerDown des listeners
>
```

Le `onPointerDown` explicite **remplace** celui fourni par `listeners` (qui est le point d'entrée du `PointerSensor`). Résultat : le sensor ne détecte jamais le début du drag.

## Correction

**Fichier** : `src/components/server-settings/RoleManager.tsx` (lignes 112-115)

Fusionner les deux handlers au lieu de remplacer :

```tsx
onPointerDown={(e) => {
  e.stopPropagation();
  // Appeler le handler du sensor s'il existe
  const sensorHandler = isDisabled ? undefined : (listeners as any)?.onPointerDown;
  sensorHandler?.(e);
}}
```

**1 fichier modifié, 4 lignes changées.**

