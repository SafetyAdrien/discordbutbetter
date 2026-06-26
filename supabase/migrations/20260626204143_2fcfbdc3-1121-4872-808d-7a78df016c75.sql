-- ============================================================================
-- Nettoyage des EXECUTE grants sur les fonctions SECURITY DEFINER
-- Groupes B (trigger functions) et C (RPC mal exposées)
-- Aucun changement sur le groupe A (helpers RLS) ni sur
-- check_username_availability / get_invite_details (vraies RPC publiques).
-- ============================================================================

-- ---------- Groupe B : fonctions trigger (aucune raison d'être appelables) ----------
REVOKE EXECUTE ON FUNCTION public.forum_update_post_counters()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_dm_messages_system_type()     FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_audit_bans()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_categories()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_channel_overrides()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_channels()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_emojis()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_invites()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_member_kick()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_member_roles()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_message_delete()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_pins()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_role_perms()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_roles()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_servers_update()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_stickers()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_threads()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_webhooks()                FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_reevaluate_connection_rules()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_reevaluate_rule_for_all_members()    FROM PUBLIC, anon, authenticated;

-- ---------- Groupe C : RPC qui ne doivent pas être appelables anonymement ----------

-- Helpers internes (jamais appelés directement par un client)
REVOKE EXECUTE ON FUNCTION public._audit(uuid, text, uuid, jsonb)     FROM PUBLIC, anon, authenticated;

-- Watchdog déclenché uniquement par heartbeat_presence (SECURITY DEFINER → tourne en postgres)
REVOKE EXECUTE ON FUNCTION public.mark_stale_users_offline()          FROM PUBLIC, anon, authenticated;

-- Heartbeat : retirer anon, garder authenticated (appelé depuis client connecté)
REVOKE EXECUTE ON FUNCTION public.heartbeat_presence()                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.heartbeat_presence(boolean)         FROM PUBLIC, anon;

-- Capture screen : DM uniquement, utilisateur connecté
REVOKE EXECUTE ON FUNCTION public.report_screen_capture(uuid, text)   FROM PUBLIC, anon;

-- Admin panel (le check is_app_admin() interne fait la garde)
REVOKE EXECUTE ON FUNCTION public.admin_search_profiles(text)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.grant_badge(uuid, uuid)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_badge(uuid, uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_badge(uuid, text, text, text, text, text, integer) FROM PUBLIC, anon;

-- Recherche de candidats pour download permissions : utilisateur connecté
REVOKE EXECUTE ON FUNCTION public.search_downloadable_candidates(text) FROM PUBLIC, anon;