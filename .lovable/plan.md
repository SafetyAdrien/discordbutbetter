

# Correctif des spinners infinis (chargement bloqué) sur mobile

## Diagnostic

Le spinner infini visible dans la capture provient de **`MobileLayout.renderChannelContent()`** (lignes 326-337). Il s'affiche dans l'overlay `chat` (z-20) lorsque la vue persistée (`mobileView`) est de type `chat` mais que :

- `currentServer` n'est pas trouvé dans `rawServers` (serveur supprimé, quitté, ou non encore rechargé), **OU**
- `channelForChat` est `null` (le salon n'existe plus, n'a jamais été chargé, ou `useChannels` n'a pas encore résolu).

Aucun mécanisme de récupération n'existe : la fallback boucle indéfiniment sur le spinner. Même problème en théorie pour `mobileView.type === 'thread'` et `channels` quand le serveur cible a disparu.

## Correctifs

### 1. `src/components/mobile/MobileLayout.tsx` — Récupération automatique sur état orphelin

Dans le `useEffect` de validation initiale, après que les serveurs sont chargés (`servers` non vide ET non en attente), vérifier que la `mobileView` persistée pointe vers un serveur/salon valide :

- Si `mobileView.type` est `chat`, `channels` ou `thread` ET que `mobileView.serverId` n'existe pas dans `rawServers` → reset à `{ type: 'tab' }`.
- Si `mobileView.type === 'chat'` ET que `channelsData` est chargé pour ce serveur ET que `mobileView.channelId` n'existe pas dans cet arbre → reset à `{ type: 'channels', serverId }`.
- Si `mobileView.type === 'thread'` ET que le salon parent n'existe plus → reset à `{ type: 'tab' }`.

Ajouter aussi un **timeout de sécurité** : si après 4 secondes le `renderChannelContent` est toujours en fallback (channelForChat/currentServer null), forcer `setMobileView({ type: 'tab' })`. Cela garantit qu'aucun spinner ne reste bloqué plus de quelques secondes, même en cas de réseau lent.

### 2. `src/components/mobile/MobileLayout.tsx` — Fallback explicite avec action

Remplacer le spinner muet (lignes 326-337) par un état avec :
- back button fonctionnel (déjà présent),
- spinner pendant les 2 premières secondes,
- ensuite un message "Salon introuvable" + bouton "Retour" qui appelle `setMobileView({ type: 'tab' })`.

### 3. `src/components/mobile/MobileServersView.tsx` — Cohérence du serveur sélectionné

Si `selectedServerId` ne correspond plus à aucun serveur dans `sortedServers` (serveur quitté/supprimé), reset automatique vers `sortedServers[0]?.id` ou `null` + `showDMs = true`. Étendre le `useEffect` ligne 190 pour gérer ce cas.

### 4. `src/hooks/usePreloader.ts` — Robustesse de la navigation persistée

Lorsque l'on hydrate `lastChannelId` au boot, s'il n'apparaît pas dans le cache des channels du `targetServerId`, ne PAS pré-positionner sur ce salon. Cela évite que `MobileLayout` démarre directement en mode `chat` sur un salon disparu.

## Résultat attendu

- Plus jamais de spinner figé après suppression/déconnexion d'un serveur ou d'un salon.
- Récupération automatique en moins de 4 secondes sur les états orphelins (timeout de sécurité).
- Message clair + bouton retour si un salon devient introuvable.
- Navigation persistée toujours valide après reconnexion.

## Détails techniques

- Validation initiale dans un nouveau `useEffect` exécuté après que `rawServers` est non vide, dépendances `[rawServers, channelsData, mobileView]`.
- Le timeout de 4s est armé/désarmé via `useEffect` qui surveille `mobileView.type === 'chat' && !channelForChat`.
- Toutes les transitions passent par `setMobileView` (donc déjà persistées via `persistMobileView`).
- Aucune modification des hooks de données (`useChannels`, `useServers`) — uniquement de la logique de récupération côté `MobileLayout`/`MobileServersView`.
