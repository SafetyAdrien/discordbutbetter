
Objectif: corriger définitivement le fait que les changements de rôles/permissions ne se propagent pas instantanément à l’utilisateur B (sans refresh), que le changement soit fait via clic droit ou via le profil.

Constats vérifiés
- Le backend est bien configuré pour le realtime sur les tables concernées :
  - `member_roles` est bien dans la publication realtime.
  - `role_permissions`, `roles`, `channel_permission_overrides`, `category_permission_overrides` sont aussi publiées.
  - `REPLICA IDENTITY FULL` est actif sur ces tables.
- Côté client, on voit bien des événements arriver (`[Permissions Realtime] ... (member_roles)` dans les logs).
- Donc le problème restant est très probablement côté synchronisation cache/UI (pas côté publication DB).

Cause probable (et cohérente avec “ça marche seulement après refresh”)
- Le flux actuel dépend de plusieurs subscriptions + locks + refetch `type: 'active'` uniquement.
- Résultat: certains caches restent “frais mais obsolètes” dans des vues inactives, ou des événements peuvent être ignorés pendant les locks de mutation.
- Le hook `useMembers` fait un patch local sur `member_roles` mais sans refetch garanti systématique, ce qui peut laisser un état partiel côté client B selon timing/état du cache.

Plan de correction (implémentation)
1) Renforcer `useMembers` pour rendre la synchro déterministe
- Fichier: `src/hooks/useMembers.ts`
- Actions:
  - Garder l’update optimiste local instantané sur événement `member_roles` (INSERT/DELETE) pour la fluidité.
  - Ajouter un refetch garanti et débouncé de `['members', serverId]` après événement `member_roles` (pas seulement patch local).
  - Si lock actif (`membersMutationLockRef`), planifier un refetch post-lock au lieu d’ignorer silencieusement l’événement.
  - Étendre la gestion des statuts de channel (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) avec fallback robuste (refetch contrôlé).
- Impact: même si un patch local rate (timing/lookup), la vérité serveur recale immédiatement l’UI.

2) Renforcer `usePermissionsRealtime` pour éviter les états périmés
- Fichier: `src/hooks/usePermissionsRealtime.ts`
- Actions:
  - Passer d’un simple `refetchQueries(..., type:'active')` à une stratégie double:
    - `invalidateQueries` pour marquer tous les caches concernés comme stale.
    - `refetchQueries` pour les queries actives (retour immédiat visuel).
  - Inclure explicitement la cohérence du cache membres (pour les cas de rôle assigné/supprimé qui impactent permissions calculées + badges).
  - Conserver le debounce, mais garantir qu’un événement `member_roles` déclenche toujours une remise en cohérence.
- Impact: plus de dépendance fragile aux seules queries actives au moment exact de l’événement.

3) Sécuriser le chemin “mutation locale” dans `RoleCheckboxItem`
- Fichier: `src/components/profile/RoleCheckboxItem.tsx`
- Actions:
  - Après succès mutation (insert/delete), déclencher explicitement la remise en cohérence permission + members (pas seulement `role-member-counts`).
  - Ajuster la logique lock pour minimiser la fenêtre où un événement utile est perdu.
- Impact: l’acteur voit instantanément + reste cohérent, et les autres clients restent synchronisés.

4) Uniformiser les helpers de refetch permission/members
- Fichiers: hooks permissions/roles concernés
- Actions:
  - Créer/utiliser un helper unique de “refresh cohérence rôles+permissions” pour éviter des comportements différents selon le point d’entrée (clic droit vs profil).
- Impact: comportement identique sur tous les chemins UI.

Plan de validation (obligatoire, en end-to-end)
1. Ouvrir 2 sessions simultanées (A et B) sur le même serveur/salon.
2. Depuis A, attribuer un rôle à B via clic droit:
   - Attendu: badges rôles + accès salons/actions de B changent en <1s sans refresh.
3. Refaire le test via menu profil utilisateur:
   - Attendu identique.
4. Retirer le rôle:
   - Attendu: rollback visuel instantané chez A + propagation immédiate chez B.
5. Cas “soi-même”:
   - A modifie ses propres rôles, et l’UI permissions se recalcule immédiatement sans reload.
6. Contrôle régression:
   - vérifier absence de flicker excessif, absence de double updates, absence d’erreurs console realtime.

Risques / points d’attention
- Trop de refetch peut coûter en réseau: on limitera avec debounce court + ciblage de clés.
- Les locks doivent éviter les oscillations sans “manger” les événements.
- Il faut conserver l’expérience instantanée (optimistic) tout en garantissant convergence serveur.

Résultat attendu après correction
- Assignation/suppression/modification des rôles et permissions réellement instantanée entre clients.
- Plus besoin de refresh navigateur pour voir les changements, quel que soit le point d’entrée UI.
