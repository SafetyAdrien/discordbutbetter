-- Add new permissions to the server_permission enum
-- General permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_channel';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_instant_invite';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'change_nickname';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_nicknames';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_emojis';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_stickers';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_audit_log';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_server_insights';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_webhooks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_guild_expressions';

-- Text channel permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'add_reactions';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_slash_commands';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_external_emojis';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_external_stickers';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'embed_links';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'attach_files';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'read_message_history';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'send_tts_messages';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_application_commands';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'send_voice_messages';

-- Thread permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_public_threads';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_private_threads';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'send_messages_in_threads';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_threads';

-- Voice permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'stream';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_soundboard';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_external_sounds';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_voice_activity';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'priority_speaker';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'deafen_members';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'use_embedded_activities';

-- Stage permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'request_to_speak';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'start_embedded_activities';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'moderate_stage';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'become_speaker';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'start_stage_session';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'end_stage_session';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'invite_stage_speaker';

-- Forum permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_forum_posts';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_forum_posts';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'pin_forum_posts';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'archive_forum_posts';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'lock_forum_posts';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'add_forum_tags';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_forum_tags';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'moderate_forum';

-- Announcement permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'publish_messages';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'follow_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'edit_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'delete_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'pin_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'feature_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'moderate_announcements';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_announcement_analytics';

-- Media permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'upload_media';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'download_media';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_media';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_albums';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'delete_albums';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'organize_media';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'tag_media';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'share_media';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'moderate_media';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_media_analytics';

-- Calendar permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'edit_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'delete_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'rsvp_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'invite_to_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_event_rsvps';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_recurring_events';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'moderate_events';

-- Tasks permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'edit_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'delete_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'assign_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'complete_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'reopen_tasks';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_task_lists';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_task_lists';

-- Poll permissions
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_polls';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'vote_in_polls';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'manage_polls';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_poll_results';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'end_polls';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'edit_polls';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'delete_polls';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'create_anonymous_polls';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'view_poll_voters';
ALTER TYPE server_permission ADD VALUE IF NOT EXISTS 'moderate_polls';