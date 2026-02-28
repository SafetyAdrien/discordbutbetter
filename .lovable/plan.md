

# Refactoriser le Drag & Drop Desktop des serveurs (adopter l'approche Mobile)

## Analyse des differences

Le code mobile (`MobileServersView`) est plus simple et plus fiable :
- Utilise `arrayMove` directement sans calcul complexe before/after
- `dropAnimation={null}` pour un overlay plus fluide
- `wasDraggingRef` pour eviter les clics parasites apres un drag
- `useCallback` sur tous les handlers
- Pas de `restrictToParentElement` (evite les blocages aux bords)
- Drop indicator rendu inline (avant/apres le bouton) au lieu d'un positionnement absolu fragile

Le code desktop (`ServerList`) a une logique plus complexe et fragile :
- `dropPositionRef` + `dropPosition` state en parallele
- Calcul manuel de `newIndex` avec before/after et ajustements d'index
- Pas de protection contre les clics post-drag
- Drop indicator en position absolue

## Changements prevus

### Fichier : `src/components/layout/ServerList.tsx`

1. **Simplifier les handlers DnD** :
   - `handleDragStart` : ajouter `wasDraggingRef.current = true`
   - `handleDragOver` : simplifier comme le mobile (juste `setOverId` + calcul before/after par index)
   - `handleDragEnd` : utiliser `arrayMove(serverIds, oldIndex, newIndex)` directement comme le mobile, sans le calcul complexe before/after
   - `handleDragCancel` : ajouter le `setTimeout` pour `wasDraggingRef`
   - Envelopper tous les handlers avec `useCallback`

2. **Ajouter `wasDraggingRef`** pour empecher les clics parasites apres un drag, comme sur mobile

3. **Supprimer `dropPositionRef`** devenu inutile avec la logique simplifiee

4. **DragOverlay** : ajouter `dropAnimation={null}` pour un rendu plus fluide

5. **Retirer `restrictToParentElement`** du tableau de modifiers (garder uniquement `restrictToVerticalAxis`)

6. **Drop indicator** : passer au rendu inline (avant/apres le bouton) au lieu du positionnement absolu, comme sur mobile

7. **Proteger `handleServerClick`** : ignorer si `wasDraggingRef.current` est true

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/layout/ServerList.tsx` | Refactoriser la logique DnD pour adopter l'approche mobile |

## Resultat attendu

- Comportement de drag identique au mobile : fluide, sans clics parasites, indicateur visible
- Code plus simple et maintenable
- Pas de changement visuel pour l'utilisateur (memes indicateurs bleus, meme overlay)

