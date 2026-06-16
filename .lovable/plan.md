## Audit log "Discord-style" — branchement complet

L'infrastructure existe déjà (table `audit_logs`, RLS, RPC `insert_audit_log`, hook `useAuditLogs`, UI `AuditLogManager`, permission `view_audit_log`) **mais aucune action de l'app n'écrit dedans** → le journal est toujours vide. On va le câbler proprement.

### Approche : triggers DB plutôt que client

Discord journalise côté serveur, jamais côté client (les clients peuvent skipper). On ajoute des triggers PostgreSQL `AFTER INSERT/UPDATE/DELETE` sur les tables sensibles, qui inscrivent l'entrée dans `audit_logs` avec `auth.uid()` comme acteur. Si `auth.uid()` est NULL (cascade, action système), le trigger n'inscrit rien.

### 1. Actions journalisées (triggers DB)

| Table                  | Évènement                | Action type                                                                  |
|------------------------|--------------------------|------------------------------------------------------------------------------|
| `servers`              | UPDATE                   | `server_update` (capture diffs : name, icon, banner, description, owners)    |
| `server_members`       | DELETE (actor ≠ user)    | `member_kick`                                                                |
| `server_bans`          | INSERT / DELETE          | `member_ban` / `member_unban`                                                |
| `roles`                | INSERT / UPDATE / DELETE | `role_create` / `role_update` / `role_delete`                                |
| `member_roles`         | INSERT / DELETE          | `member_role_add` / `member_role_remove`                                     |
| `role_permissions`     | INSERT / DELETE          | `role_permission_grant` / `role_permission_revoke`                           |
| `categories`           | INSERT / UPDATE / DELETE | `category_create` / `category_update` / `category_delete`                    |
| `channels`             | INSERT / UPDATE / DELETE | `channel_create` / `channel_update` / `channel_delete`                       |
| `channel_permission_overrides` | INSERT/UPDATE/DELETE | `channel_overwrite_create/update/delete`                                |
| `invites`              | INSERT / DELETE          | `invite_create` / `invite_delete`                                            |
| `webhooks`             | INSERT / UPDATE / DELETE | `webhook_create` / `webhook_update` / `webhook_delete`                       |
| `server_emojis`        | INSERT / UPDATE / DELETE | `emoji_create` / `emoji_update` / `emoji_delete`                             |
| `server_stickers`      | INSERT / UPDATE / DELETE | `sticker_create` / `sticker_update` / `sticker_delete`                       |
| `messages`             | DELETE (actor ≠ author)  | `message_delete`                                                             |
| `pinned_messages`      | INSERT / DELETE          | `message_pin` / `message_unpin`                                              |
| `threads`              | INSERT / DELETE          | `thread_create` / `thread_delete`                                            |

Chaque trigger remplit `details` (jsonb) avec les infos utiles : nom de la ressource, changements `{ field: { old, new } }`, raison (ban), etc. `target_id` pointe vers un `profiles.id` quand l'action vise un membre, sinon NULL et l'ID de ressource va dans `details`.

### 2. Hook & UI

`src/hooks/useAuditLogs.ts`
- Étendre `ACTION_TYPES` avec tous les nouveaux types, regroupés par catégorie (Membres / Rôles / Salons / Serveur / Webhooks / Emojis / Messages).
- Ajouter `category` + `icon` (lucide) à chaque entrée.

`src/components/server-settings/AuditLogManager.tsx`
- Popover filtre : sections collapsibles par catégorie au lieu d'une liste plate.
- Rendu enrichi des `details` : pour `*_update`, afficher les diffs sous forme `champ : ancien → nouveau`. Pour create/delete, afficher le nom de la ressource.
- Icône d'action devant le badge (`<History>` remplacé par l'icône de la catégorie).
- Si l'utilisateur n'a pas `view_audit_log` ni n'est owner : afficher état "Accès restreint" (la RLS bloque déjà la requête, on traite juste l'erreur côté UI).

### 3. Garde-fous

- Trigger fonctions en `SECURITY DEFINER`, `SET search_path = public`.
- Garde `IF auth.uid() IS NULL THEN RETURN NEW; END IF;` → pas de log pour cascades (suppression de serveur, seeds, edge functions service_role).
- `member_kick` : trigger sur `server_members DELETE` qui inscrit uniquement si `auth.uid() <> OLD.user_id` (sinon = "leave server", pas un kick).
- `message_delete` : uniquement si `auth.uid() <> OLD.author_id` (sinon = auto-suppression).
- Limite UI : déjà à 100 entrées + realtime, on garde tel quel.

### Détails techniques

**Fichiers touchés**
- `supabase/migrations/<timestamp>_audit_log_triggers.sql` (nouveau) — fonctions trigger + `CREATE TRIGGER` sur chaque table.
- `src/hooks/useAuditLogs.ts` — extension `ACTION_TYPES` + catégories.
- `src/components/server-settings/AuditLogManager.tsx` — filtre par catégorie, rendu diff, icônes.

**Pas touché** : `audit_logs` table/RLS (déjà bonnes), `insert_audit_log` RPC (gardée pour `transfer_server_ownership` qui l'appelle déjà), permission `view_audit_log` (déjà existante).

**Coût** : un trigger par table, overhead négligeable (un INSERT supplémentaire par mutation surveillée).