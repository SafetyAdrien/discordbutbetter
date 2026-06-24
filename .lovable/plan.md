
## Objectif

Quand la page de l'app est ouverte et que l'utilisateur reste inactif au-delà du délai configuré (5 min), son statut bascule **toujours** vers `Idle`, peu importe son statut courant (`online`, `dnd`, etc.). Le statut `Offline` n'est déclenché que lorsque l'utilisateur ferme l'onglet ou le navigateur — jamais par simple inactivité avec page ouverte.

## Règles cibles

Page ouverte (heartbeat actif côté client) :
- `online` + 5 min sans activité → `idle`
- `dnd` + 5 min sans activité → `idle` (nouveau, écrase le manuel)
- `idle` → reste `idle` indéfiniment
- `offline` (manuel) → reste `offline`

Page/onglet fermé (plus de heartbeat) :
- N'importe quel statut → `offline` (déclenché par `beforeunload`/`pagehide` côté client, et par le watchdog `last_seen_at` côté serveur en filet de sécurité)

## Modifications client — `src/hooks/usePresence.ts`

1. Supprimer les bascules auto `idle → offline` et `dnd → offline` :
   - Retirer `IDLE_TO_OFFLINE_TIMEOUT`, `DND_TO_OFFLINE_TIMEOUT`, `offlineTimerRef`, `dndOfflineTimerRef`, `scheduleDndOffline`, `clearOfflineTimer`, `clearDndOfflineTimer` et leurs `setTimeout` enchaînés dans `handleActivity` et `handleVisibilityChange`.
2. Forcer la bascule vers `idle` même depuis `dnd` quand le timer d'inactivité expire :
   - Dans `handleActivity` → après `IDLE_TIMEOUT`, appeler `updateStatus('idle', true)` si statut courant ∈ {`online`, `dnd`}. Conserver le respect de `isManualIdleRef`/`isManualOfflineRef`.
   - Idem dans `handleVisibilityChange` (onglet caché 5 min).
3. Le `dnd` automatique-vers-`idle` ne doit pas être considéré comme manuel : reset `isManualDndRef = false` au moment de la bascule afin que la moindre activité ultérieure ramène à `online`.
4. `handleBeforeUnload`/`pagehide` : garder le PATCH `status=offline` existant — c'est la seule voie vers `offline` quand la page se ferme.
5. Garder le heartbeat passif 30 s (`heartbeat_presence({ _active: false })`) pour que le serveur sache que la page est ouverte.

## Modifications serveur — nouvelle migration SQL

Remplacer la fonction `mark_stale_users_offline()` pour qu'elle :

- **`online` → `idle`** si `last_activity_at < now() - 5 minutes` ET `last_seen_at > now() - 2 minutes` (page ouverte).
- **`dnd` → `idle`** si `last_activity_at < now() - 5 minutes` ET `last_seen_at > now() - 2 minutes` (page ouverte, nouvelle règle).
- **N'importe quel statut ≠ `offline` → `offline`** si `last_seen_at < now() - 2 minutes` (page fermée / watchdog).
- **Supprimer** les règles `idle → offline` et `dnd → offline` basées uniquement sur `last_activity_at` — l'inactivité prolongée page ouverte ne provoque plus jamais l'offline.

Le seuil `last_seen_at` de 2 min laisse une marge confortable au-dessus du heartbeat client de 30 s.

## Hors scope

- Aucune modif de schéma, RLS, ou table.
- `useProfilesRealtime`, `AuthContext`, `PresenceContext` inchangés.
- Le menu manuel de statut (`setManualStatus`) reste identique : `dnd`/`idle`/`offline` manuels continuent d'être respectés (sauf que `dnd` manuel finira aussi par tomber en `idle` après 5 min d'inactivité, comme demandé).
