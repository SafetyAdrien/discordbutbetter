

# Masquer "Quitter le serveur" pour les propriétaires (principal ET secondaire)

## Problème
Le bouton "Quitter le serveur" est visible pour le propriétaire principal (et secondaire) dans :
1. **ServerList.tsx** — menu contextuel clic droit
2. **ChannelList.tsx** — bouton sur la bannière
3. **MobileChannelListView.tsx** — déjà corrigé (vérifie `owner_id` ET `secondary_owner_id`)

## Changements

### 1. `src/components/layout/ChannelList.tsx` (ligne 1421)
- Remplacer `!isOwner` par `!isGod` — `isGod` est déjà disponible via `usePermissions` (ligne 885) et couvre propriétaire principal + secondaire.

### 2. `src/components/layout/ServerList.tsx`
- **SortableServerIcon** : ajouter une prop `isGod: boolean` et conditionner l'affichage du `ContextMenuItem` "Quitter le serveur" avec `!isGod`.
- **ServerList** : pour chaque serveur, passer `isGod` en utilisant `useAuth` pour comparer `user.id` avec `server.ownerId`. Pour le secondary owner, il faut aussi le vérifier. Deux options :
  - Utiliser `usePermissions(server.id)` dans `SortableServerIcon` (le plus propre, hook déjà existant).
- **handleLeaveServer** : ajouter la vérification du secondary owner en plus du owner principal (nécessite de connaître le `secondary_owner_id` — on peut bloquer côté UI via le masquage du bouton, le backend `useLeaveServer` devrait déjà gérer).

### Approche retenue
Dans `SortableServerIcon`, appeler `usePermissions(server.id)` pour obtenir `isGod`, et masquer conditionnellement le menu item. Cela évite de modifier le type `Server` et centralise la logique.

