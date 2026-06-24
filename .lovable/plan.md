## Objectif

Appliquer les transitions de statut à **tous les utilisateurs** (pas seulement le client local) en faisant tourner les règles côté serveur, en plus du client déjà à 5 min.

Règles cibles (client + serveur) :
- `online` → `idle` : 5 min sans activité
- `idle` → `offline` : 5 min de plus (10 min cumulés sans activité)
- `dnd` → `offline` : 5 min sans activité

## État actuel

Côté client (`src/hooks/usePresence.ts`) : timers déjà à 5 min, OK.

Côté serveur (déjà en place) :
- Colonnes `profiles.last_activity_at` et `last_seen_at`.
- RPC `heartbeat_presence(_active boolean)` qui met à jour `last_seen_at` (toujours) et `last_activity_at` (si `_active=true`).
- Cron `mark-stale-users-offline` toutes les minutes qui fait :
  - `status <> offline` + `last_seen_at < now - 90s` → `offline` (watchdog onglet fermé)
  - `online` + `last_activity_at < now - 5min` → `idle`
  - **manque** : `idle` → `offline` (+5 min) et `dnd` → `offline` (+5 min).

Problème bloquant : le client **n'appelle jamais** `heartbeat_presence`, donc `last_seen_at` ne bouge pas et le watchdog 90 s passerait tout le monde offline.

## Plan

### 1. Brancher le heartbeat côté client

Dans `src/hooks/usePresence.ts` :
- À chaque `handleActivity` réelle (souris/clavier/touch), appeler `supabase.rpc('heartbeat_presence', { _active: true })` **throttlé à 1×/30 s**.
- Un `setInterval` de 30 s envoie `heartbeat_presence({ _active: false })` tant que l'onglet existe (même caché) → garde `last_seen_at` frais sans toucher `last_activity_at`.
- `beforeunload`/`pagehide` : conserver le PATCH `status=offline` existant.

Résultat : `last_activity_at` reflète la vraie activité de chaque user, `last_seen_at` prouve juste que l'onglet vit.

### 2. Étendre le sweeper SQL

Migration mettant à jour `public.mark_stale_users_offline()` :

```sql
CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Watchdog : onglet fermé / crash
  UPDATE profiles SET status='offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '90 seconds';

  -- online -> idle (5 min sans activité)
  UPDATE profiles SET status='idle'
   WHERE status='online'
     AND last_activity_at < now() - interval '5 minutes'
     AND last_seen_at >= now() - interval '90 seconds';

  -- idle -> offline (5 min de plus = 10 min cumulés)
  UPDATE profiles SET status='offline'
   WHERE status='idle'
     AND last_activity_at < now() - interval '10 minutes';

  -- dnd -> offline (5 min sans activité)
  UPDATE profiles SET status='offline'
   WHERE status='dnd'
     AND last_activity_at < now() - interval '5 minutes';
END;
$$;
```

Le cron existant `* * * * *` reste inchangé → vérification chaque minute pour tous les utilisateurs.

### 3. Cohérence client / serveur

- Les timeouts client restent à 5 min (déjà fait) → l'utilisateur local voit la transition immédiatement sans attendre le cron.
- Pour les autres utilisateurs, la propagation Realtime sur `profiles.status` (déjà en place via `useProfilesRealtime`) diffuse instantanément le changement dès que le cron met à jour la DB.

### Fichiers touchés

- `src/hooks/usePresence.ts` — ajout heartbeat RPC (activité throttlée + interval 30 s).
- Nouvelle migration SQL — remplace `mark_stale_users_offline()` avec les 2 règles supplémentaires.

Pas de changement de schéma, pas de nouvelle table, pas de modif RLS.
