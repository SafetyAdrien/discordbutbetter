# Plan — Confidentialité : Téléchargements & Détection capture (révisé)

## 1. Téléchargement de mon contenu (liste d'autorisation)

### Backend (migration)
- Table `public.download_permissions`
  - `id uuid pk`, `owner_id uuid → auth.users`, `allowed_user_id uuid → auth.users`, `created_at timestamptz`
  - `UNIQUE (owner_id, allowed_user_id)`, `CHECK owner_id <> allowed_user_id`
- GRANT `SELECT, INSERT, DELETE` → `authenticated`, `ALL` → `service_role`
- RLS :
  - SELECT : `owner_id = auth.uid() OR allowed_user_id = auth.uid()` (nécessaire pour que le destinataire reçoive le payload Realtime)
  - INSERT/DELETE : `owner_id = auth.uid()`
- RPC `public.can_download_user_content(_owner_id uuid, _viewer_id uuid) returns boolean` — SECURITY DEFINER, STABLE
- RPC `public.search_downloadable_candidates(_query text)` — SECURITY DEFINER, union amis acceptés + membres serveurs communs, exclut self et déjà autorisés
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.download_permissions`

### Frontend
- Page `src/components/account-settings/DownloadPermissionsSettings.tsx` (recherche-filtre + bouton Add + liste avec icône X + texte d'aide capture d'écran)
- `AddDownloadPermissionModal.tsx` : recherche via `search_downloadable_candidates`, clic = ajout direct
- Hook `useDownloadPermissions.ts` : list (owner) / add / remove + `useCanDownload(ownerId)` (cache-first)
- **2 souscriptions Realtime** sur `download_permissions` :
  1. `filter: owner_id=eq.{uid}` → met à jour la liste affichée dans les paramètres (autre onglet)
  2. `filter: allowed_user_id=eq.{uid}` → invalide les caches `can-download:{ownerId}` pour faire apparaître **immédiatement** le bouton "Télécharger" chez la personne qui vient d'être autorisée, sans refresh
- Brancher la page dans `PrivacySettings.tsx`
- Gardes UI sur contenu d'autrui uniquement (avatar, bannière, pièces jointes, lightboxes média/forum) : `if (!canDownload && authorId !== currentUserId) → masquer l'option`. Le contenu reste visible.

## 2. Détection capture d'écran (DMs natifs uniquement)

### Dépendance
- `npm i @capacitor-community/privacy-screen` (sync Capacitor à faire par l'utilisateur)

### Backend (migration)
- Colonne `profiles.notify_screenshot_capture boolean DEFAULT true`
- Colonne `dm_messages.system_type text NULL` (valeurs : `'screenshot' | 'screen_recording_start' | 'screen_recording_stop'`)
- **Confirmé** : `author_id` reste **rempli** avec l'ID du capteur (pas NULL). `system_type` sert uniquement à distinguer le rendu (ligne italique centrée) d'un message texte normal.
- **Protection insertion** : trigger `BEFORE INSERT OR UPDATE` sur `dm_messages` qui rejette toute écriture où `system_type IS NOT NULL` si l'appel n'est pas SECURITY DEFINER. Pattern :
  - Le trigger compare `current_setting('app.allow_system_type', true)` à `'1'`. S'il n'est pas posé → `RAISE EXCEPTION`.
  - Le RPC `report_screen_capture` exécute `PERFORM set_config('app.allow_system_type', '1', true);` avant l'INSERT (scope transaction).
  - Résultat : seul le RPC SECURITY DEFINER peut poser `system_type`. Les INSERT clients normaux (qui ne passent pas par le RPC) ne peuvent pas le faire, même en trichant côté client.
- RPC `public.report_screen_capture(_conversation_id uuid, _event text) returns void` — SECURITY DEFINER
  - Vérifie `is_dm_participant(auth.uid(), _conversation_id)`
  - Lit `profiles.notify_screenshot_capture` du caller ; si `false`, return sans insérer
  - `set_config('app.allow_system_type', '1', true)` puis `INSERT INTO dm_messages (conversation_id, author_id, system_type, content)` avec `author_id = auth.uid()` et `content = ''`

### Frontend
- Hook `src/hooks/useScreenCaptureDetection.ts` : guard `Capacitor.isNativePlatform()`, monté dans `DMConversation.tsx`, écoute `screenshotTaken` / `screenRecordingStarted` / `screenRecordingStopped`, appelle le RPC avec la conversation active
- Rendu DM : `dm_messages` avec `system_type` non-null → ligne italique centrée "{author.display_name} a pris une capture d'écran." / "a démarré un enregistrement d'écran." / "a arrêté un enregistrement d'écran."
- Toggle dans `PrivacySettings.tsx` lié à `profiles.notify_screenshot_capture` (par défaut ON)

## Fichiers
- **Nouveaux** : `DownloadPermissionsSettings.tsx`, `AddDownloadPermissionModal.tsx`, `useDownloadPermissions.ts`, `useScreenCaptureDetection.ts`
- **Modifiés** : `PrivacySettings.tsx` (utilisateur), `AccountSettingsModal.tsx`, `DMConversation.tsx`, `useDMMessages.ts` (rendu system), `FullUserProfileModal.tsx`, `UserProfilePopup.tsx`, `MessageAttachment.tsx` + lightboxes média/forum, `useCacheRehydrate.ts`
- **Migrations** : table + RLS + RPCs + colonnes profiles/dm_messages + trigger anti-bypass + publication realtime
