## Objectif

Aligner la logique de présence client + serveur sur ces règles, avec propagation temps réel à tous les utilisateurs :

| Situation | Délai | Nouveau statut |
|---|---|---|
| Statut `online` / `dnd`, page ouverte mais aucune activité | 5 min | `idle` |
| Statut `idle` (ou n'importe quel statut) + page/onglet fermé | 5 min après la fermeture | `offline` |
| Retour de l'utilisateur (activité ou ouverture) | instantané | restauration du statut choisi par l'utilisateur (`online` par défaut, ou `dnd` s'il l'avait fixé) |

Total disconnect → offline ≈ 10 min (5 min online→idle + 5 min idle→offline) si l'utilisateur n'était pas déjà idle/dnd.

## Problèmes actuels

1. **`mark_stale_users_offline`** marque `offline` dès **2 min** sans heartbeat → trop court, ne respecte pas la règle « 5 min après fermeture ».
2. **`handleBeforeUnload`** côté client force `status='offline'` immédiatement → contourne le délai de 5 min souhaité.
3. **Aucune mémoire du statut choisi** : quand un utilisateur en `dnd` ferme l'onglet puis revient, il repasse en `online` au lieu de retrouver `dnd`.

## Changements

### 1. Base de données (migration)

- Ajouter `profiles.manual_status user_status NULL` (statut choisi explicitement par l'utilisateur — sert de mémoire pour la restauration).
- Réécrire `public.mark_stale_users_offline()` :
  - `online`/`dnd` avec `last_activity_at < now() - 5 min` et `last_seen_at >= now() - 5 min` → `idle` (page toujours ouverte).
  - Tout statut `<> 'offline'` avec `last_seen_at < now() - 5 min` → `offline` (plus de heartbeat = page fermée).
  - Le `manual_status` n'est jamais modifié par le sweeper.
- Le job cron `* * * * *` existant continue d'appeler cette fonction.

### 2. Client — `src/hooks/usePresence.ts`

- **Supprimer `handleBeforeUnload`** (et ses listeners `beforeunload`/`pagehide`) : on laisse le serveur basculer en `offline` après 5 min sans heartbeat.
- **Écrire `manual_status`** quand l'utilisateur choisit explicitement un statut via `setManualStatus` (online/idle/dnd/offline) → `updateProfile({ status, manual_status: status })`.
- **À l'initialisation / au retour réseau** : si `profile.status` est `offline` ou `idle` (transition auto) ET `manual_status` existe → restaurer `status = manual_status` ; sinon `online` par défaut.
- Conserver `IDLE_TIMEOUT = 5 min` et le heartbeat 30 s (déjà cohérents avec le seuil serveur).

### 3. Endroit où l'utilisateur choisit son statut

Mettre à jour les callers de `setManualStatus` (menu de statut dans le profil) pour persister aussi `manual_status` via `updateProfile`. Aucun changement d'UI.

### 4. Temps réel

Aucun nouveau canal nécessaire : `useProfilesRealtime` écoute déjà les `UPDATE` sur `profiles`. Les bascules effectuées par le sweeper SQL sont diffusées automatiquement à tous les clients.

## Fichiers touchés

- Migration SQL : nouvelle colonne `manual_status` + remplacement de `mark_stale_users_offline`.
- `src/hooks/usePresence.ts` : retrait du `beforeunload`, écriture/lecture de `manual_status`, restauration au retour.
- `src/contexts/PresenceContext.tsx` : signature inchangée (no-op si besoin).
- Composant de sélection de statut (menu profil) : passer `manual_status` lors d'un choix explicite.

## Vérification

- `mark_stale_users_offline()` testé manuellement sur des lignes avec `last_seen_at` antédaté.
- Scénarios manuels : (a) inactivité 5 min → idle ; (b) fermer onglet en `online` → idle 5 min puis offline 5 min après ; (c) rouvrir → restauration `dnd` si choisi.
