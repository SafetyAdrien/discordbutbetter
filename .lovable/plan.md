Problème : dans `RoleCheckboxItem`, l'état des rôles est mis à jour de façon optimiste, mais deux mécanismes (`useMembers.rolesChannelRef` et `usePermissionsRealtime`) déclenchent un refetch de `['members', serverId]` juste après le verrou de mutation. Si ce refetch revient avant que l'écriture DB ne soit propagée, il écrase l'état optimiste par l'ancienne valeur, puis l'événement Realtime (ou un second refetch) le remet à jour → le rôle disparaît/réapparaît instantanément.

Objectif : empêcher tout retour en arrière temporaire (« saut ») lors d'un clic sur un rôle.

Plan de correction
------------------

1. Ajouter un tracker de mutations de rôles
   - Créer `src/lib/role-mutation-tracker.ts`.
   - Stocker les opérations en cours par clé `serverId:memberId:roleId` avec une cible (`'add'` ou `'remove'`).
   - Fournir `setRoleMutationPending`, `clearRoleMutationPending`, `isRoleMutationPending`, `getRoleMutationTarget`.

2. Protéger `RoleCheckboxItem`
   - Avant l'appel Supabase, enregistrer la cible dans le tracker.
   - Garder le bouton désactivé tant que la mutation est en vol (pas seulement `isPending` local).
   - Libérer le tracker après succès + une fenêtre de stabilisation (~800 ms), ou dès qu'un événement Realtime confirmant la même direction est reçu.
   - En cas d'erreur, rollback et libérer immédiatement.

3. Renforcer `useMembers`
   - Dans le handler Realtime `member_roles` (INSERT/DELETE), ignorer les événements qui contredisent une mutation pending pour le couple membre/rôle.
   - Si l'événement correspond à la cible attendue, appliquer le patch et libérer le pending.
   - Dans `scheduleGuaranteedRefetch`, lorsque le refetch revient, fusionner le résultat serveur avec les cibles pending : pour chaque rôle pending, forcer la présence/absence selon la cible plutôt que d'écraser aveuglément.
   - Augmenter la durée du `membersMutationLockRef` à ~800 ms pour coller au pattern de la mémoire projet.

4. Désactiver le refetch agressif de `usePermissionsRealtime` sur `member_roles`
   - Ce listener continuera d'invalider/refetcher les clés de permissions, mais ne refetchera plus activement `['members', serverId]` (car `useMembers` gère déjà le patch ciblé).
   - Cela supprime un second refetch qui court-circuite l'état optimiste.

5. Vérification
   - Build TypeScript sans erreur.
   - Test manuel : ouvrir le panneau « Gérer les rôles », cliquer plusieurs fois sur un rôle → aucun retour en arrière visuel.

Fichiers concernés
------------------
- `src/lib/role-mutation-tracker.ts` (nouveau)
- `src/components/profile/RoleCheckboxItem.tsx`
- `src/hooks/useMembers.ts`
- `src/hooks/usePermissionsRealtime.ts`