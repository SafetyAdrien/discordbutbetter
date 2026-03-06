
Objectif: supprimer définitivement la page blanche au clic sur le bouton DM, sur mobile et desktop.

Constat probable (vu dans le code actuel):
1) Le bouton DM/Home ne réinitialise pas toujours `activeDMId`.
2) Si `activeDMId` pointe vers une conversation invalide/stale (rechargement, suppression, état localStorage ancien), l’UI peut basculer dans un état incohérent.
3) Mobile et desktop utilisent deux entrées différentes vers les DMs, donc il faut corriger les deux chemins.

Plan de correction

1) Desktop: forcer un “retour DM sûr” au clic Home
- Fichier: `src/pages/Index.tsx`
- Dans `handleServerSelect(serverId)`:
  - Quand `serverId === null`, réinitialiser explicitement:
    - `setActiveServerId(null)`
    - `setActiveChannelId(null)`
    - `setActiveThreadId(null)`
    - `setThreadChannelId(null)`
    - `setActiveDMId(null)`  ← important
- Effet attendu: le clic DM/Home ouvre toujours la vue Amis/DM list, jamais une conversation potentiellement cassée.

2) Mobile: aligner le bouton DM avec le même comportement
- Fichier: `src/components/mobile/MobileServersView.tsx`
- Dans `handleDMClick`:
  - appeler `onShowFriends()` avant/avec `setShowDMs(true)`.
  - garder `setSelectedServerId(null)`.
- Effet attendu: le bouton DM mobile ouvre toujours une vue DM saine (liste/friends), même si un ancien `activeDMId` était resté en mémoire.

3) Garde-fou anti “DM invalide” (desktop + mobile)
- Fichier: `src/components/dm/DMPage.tsx` (et/ou `src/components/mobile/MobileHomeView.tsx`)
- Ajouter une vérification: si `activeDMId` est présent mais introuvable dans les conversations chargées, fallback automatique vers la vue friends/list (au lieu d’essayer d’afficher une conversation invalide).
- Effet attendu: plus de page blanche même avec un état persistant corrompu.

Détails techniques
- Aucun changement backend nécessaire.
- Le correctif est purement front/state management.
- On harmonise la logique d’entrée DM entre:
  - Desktop: bouton Home de `ServerList` -> `handleServerSelect(null)`
  - Mobile: bouton DM de `MobileServersView` -> `onShowFriends()` + `showDMs`

Validation (E2E à exécuter après implémentation)
1) Desktop:
   - Ouvrir un salon serveur → cliquer bouton DM/Home → vérifier affichage immédiat de la vue DM (pas de blanc).
2) Mobile:
   - Depuis vue serveurs, cliquer bouton DM → vérifier affichage de la liste DM/friends (pas de blanc).
3) Cas persistance:
   - Recharger la page avec un ancien `activeDMId` en storage → cliquer DM/Home → vérifier fallback propre sans écran blanc.
