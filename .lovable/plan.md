

# Harmoniser le drag-and-drop des roles avec celui des serveurs

## Objectif

Reprendre le pattern exact du drag-and-drop de la liste de serveurs (`ServerList.tsx`) pour la gestion de la hierarchie des roles (`RoleManager.tsx`) : indicateurs de depot inline (dans le flux), overlay sans animation de depot, et prevention des clics accidentels apres un drag.

## Changements prevus

### Fichier : `src/components/server-settings/RoleManager.tsx`

**1. Remplacer les indicateurs absolus par des indicateurs inline**

Actuellement, `RoleDropIndicator` est rendu en position absolue a l'interieur de chaque item. On le remplace par des indicateurs inline (dans le flux DOM, avant/apres l'element), comme dans `SortableServerIcon` :

```text
// Avant l'item
{dropIndicator === 'before' && <div className="h-[2px] bg-primary ..." />}

// L'item role

// Apres l'item
{dropIndicator === 'after' && <div className="h-[2px] bg-primary ..." />}
```

Supprimer le composant `RoleDropIndicator` et la prop `showDropIndicator` / `dropPosition` de `SortableRole`.

**2. Passer a `dropIndicator` prop (comme ServerList)**

`SortableRole` recoit une prop `dropIndicator: 'before' | 'after' | null` au lieu de `showDropIndicator` + `dropPosition`. La logique de calcul dans le parent compare `overId === role.id && activeId !== role.id`.

**3. Simplifier le calcul de position du drop**

Reprendre la logique du ServerList : comparer les index actif/over pour determiner `before`/`after` au lieu de calculer via `clientY`.

```text
const activeIdx = roleIds.indexOf(active.id);
const overIdx = roleIds.indexOf(over.id);
setDropPosition(activeIdx < overIdx ? 'after' : 'before');
```

**4. Overlay sans animation de depot**

Passer de `dropAnimation: { duration: 200, ... }` a `dropAnimation={null}` comme dans ServerList.

**5. Prevention des clics accidentels**

Ajouter un `wasDraggingRef` pour empecher la selection d'un role apres un drag, avec un `setTimeout` de 100ms pour le reset (pattern identique a ServerList).

**6. Touch sensor pour mobile**

Ajouter `TouchSensor` avec delay de 200ms pour le support mobile (appui long), comme dans `useDndSensors`.

## Resume des modifications

| Aspect | Avant (RoleManager) | Apres (pattern ServerList) |
|---|---|---|
| Indicateurs | Absolus, dans l'item | Inline, dans le flux |
| Calcul position | clientY vs middleY | Comparaison d'index |
| Drop animation | 200ms cubic-bezier | null (instantane) |
| Anti-clic post-drag | absent | wasDraggingRef |
| Touch sensor | absent | TouchSensor 200ms delay |

Un seul fichier modifie : `src/components/server-settings/RoleManager.tsx`

