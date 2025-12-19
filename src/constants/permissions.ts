import type { Database } from '@/integrations/supabase/types';

type DBPermission = Database['public']['Enums']['server_permission'];

// Extended permissions type that includes all new permissions
export type ServerPermission = DBPermission | 
  // General
  'view_channel' | 'create_instant_invite' | 'change_nickname' | 'manage_nicknames' | 
  'manage_emojis' | 'manage_stickers' | 'view_audit_log' | 'view_server_insights' | 
  'manage_webhooks' | 'manage_guild_expressions' |
  // Text
  'add_reactions' | 'use_slash_commands' | 'use_external_emojis' | 'use_external_stickers' |
  'embed_links' | 'attach_files' | 'read_message_history' | 'send_tts_messages' |
  'use_application_commands' | 'send_voice_messages' |
  // Threads
  'create_public_threads' | 'create_private_threads' | 'send_messages_in_threads' | 'manage_threads' |
  // Voice
  'video' | 'stream' | 'use_soundboard' | 'use_external_sounds' | 'use_voice_activity' |
  'priority_speaker' | 'deafen_members' | 'use_embedded_activities' |
  // Stage
  'request_to_speak' | 'start_embedded_activities' | 'moderate_stage' | 'become_speaker' |
  'start_stage_session' | 'end_stage_session' | 'invite_stage_speaker' |
  // Forum
  'create_forum_posts' | 'manage_forum_posts' | 'pin_forum_posts' | 'archive_forum_posts' |
  'lock_forum_posts' | 'add_forum_tags' | 'manage_forum_tags' | 'moderate_forum' |
  // Announcement
  'publish_messages' | 'manage_announcements' | 'follow_announcements' | 'create_announcements' |
  'edit_announcements' | 'delete_announcements' | 'pin_announcements' | 'feature_announcements' |
  'moderate_announcements' | 'view_announcement_analytics' |
  // Media
  'upload_media' | 'download_media' | 'manage_media' | 'create_albums' | 'delete_albums' |
  'organize_media' | 'tag_media' | 'share_media' | 'moderate_media' | 'view_media_analytics' |
  // Calendar
  'view_events' | 'create_events' | 'edit_events' | 'delete_events' | 'manage_events' |
  'rsvp_events' | 'invite_to_events' | 'manage_event_rsvps' | 'create_recurring_events' | 'moderate_events' |
  // Tasks
  'view_tasks' | 'create_tasks' | 'edit_tasks' | 'delete_tasks' | 'manage_tasks' |
  'assign_tasks' | 'complete_tasks' | 'reopen_tasks' | 'create_task_lists' | 'manage_task_lists' |
  // Polls
  'create_polls' | 'vote_in_polls' | 'manage_polls' | 'view_poll_results' | 'end_polls' |
  'edit_polls' | 'delete_polls' | 'create_anonymous_polls' | 'view_poll_voters' | 'moderate_polls';

export interface PermissionInfo {
  key: ServerPermission;
  label: string;
  description: string;
}

export interface PermissionCategory {
  id: string;
  label: string;
  icon?: string;
  permissions: PermissionInfo[];
}

// Channel types for filtering permissions
export type ChannelType = 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage';

// Permission categories with all permissions
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'general',
    label: 'Général',
    permissions: [
      { key: 'view_channel', label: 'Voir le salon', description: 'Permet de voir ce salon et son contenu' },
      { key: 'manage_channels', label: 'Gérer les salons', description: 'Modifier les paramètres et supprimer le salon' },
      { key: 'manage_roles', label: 'Gérer les permissions', description: 'Modifier les permissions du salon' },
      { key: 'create_instant_invite', label: 'Créer des invitations', description: 'Créer des liens d\'invitation vers le serveur' },
      { key: 'manage_webhooks', label: 'Gérer les webhooks', description: 'Créer et gérer les webhooks du salon' },
      { key: 'manage_nicknames', label: 'Gérer les pseudos', description: 'Modifier les pseudos des autres membres' },
      { key: 'change_nickname', label: 'Changer son pseudo', description: 'Modifier son propre pseudo' },
      { key: 'view_audit_log', label: 'Voir le journal d\'audit', description: 'Consulter l\'historique des actions' },
      { key: 'view_server_insights', label: 'Voir les statistiques', description: 'Accéder aux statistiques du serveur' },
      { key: 'administrator', label: 'Administrateur', description: 'Tous les droits, contourne toutes les restrictions' },
    ],
  },
  {
    id: 'moderation',
    label: 'Modération',
    permissions: [
      { key: 'kick_members', label: 'Expulser des membres', description: 'Expulser des membres du serveur' },
      { key: 'ban_members', label: 'Bannir des membres', description: 'Bannir définitivement des membres' },
      { key: 'mute_members', label: 'Rendre muet', description: 'Rendre muet des membres en vocal' },
      { key: 'deafen_members', label: 'Rendre sourd', description: 'Mettre en sourdine des membres' },
      { key: 'move_members', label: 'Déplacer des membres', description: 'Déplacer des membres entre les salons vocaux' },
      { key: 'manage_messages', label: 'Gérer les messages', description: 'Supprimer et épingler les messages des autres' },
      { key: 'manage_threads', label: 'Gérer les fils', description: 'Gérer et supprimer les fils de discussion' },
      { key: 'manage_server', label: 'Gérer le serveur', description: 'Modifier les paramètres du serveur' },
      { key: 'manage_emojis', label: 'Gérer les emojis', description: 'Ajouter et supprimer des emojis personnalisés' },
      { key: 'manage_stickers', label: 'Gérer les stickers', description: 'Ajouter et supprimer des stickers' },
    ],
  },
  {
    id: 'text',
    label: 'Salons Textuels',
    permissions: [
      { key: 'send_messages', label: 'Envoyer des messages', description: 'Envoyer des messages dans ce salon' },
      { key: 'read_messages', label: 'Lire les messages', description: 'Voir les messages du salon' },
      { key: 'read_message_history', label: 'Lire l\'historique', description: 'Voir les anciens messages' },
      { key: 'embed_links', label: 'Intégrer des liens', description: 'Les liens affichent un aperçu' },
      { key: 'attach_files', label: 'Joindre des fichiers', description: 'Envoyer des fichiers et images' },
      { key: 'add_reactions', label: 'Ajouter des réactions', description: 'Réagir aux messages avec des emojis' },
      { key: 'use_external_emojis', label: 'Emojis externes', description: 'Utiliser des emojis d\'autres serveurs' },
      { key: 'use_external_stickers', label: 'Stickers externes', description: 'Utiliser des stickers d\'autres serveurs' },
      { key: 'mention_everyone', label: 'Mentionner @everyone', description: 'Mentionner tous les membres' },
      { key: 'send_tts_messages', label: 'Messages TTS', description: 'Envoyer des messages vocaux synthétiques' },
      { key: 'use_slash_commands', label: 'Commandes slash', description: 'Utiliser les commandes de l\'application' },
      { key: 'send_voice_messages', label: 'Messages vocaux', description: 'Envoyer des messages vocaux' },
    ],
  },
  {
    id: 'threads',
    label: 'Fils de discussion',
    permissions: [
      { key: 'create_public_threads', label: 'Créer des fils publics', description: 'Créer des fils visibles par tous' },
      { key: 'create_private_threads', label: 'Créer des fils privés', description: 'Créer des fils sur invitation' },
      { key: 'send_messages_in_threads', label: 'Messages dans les fils', description: 'Envoyer des messages dans les fils' },
      { key: 'manage_threads', label: 'Gérer les fils', description: 'Modifier et supprimer les fils' },
    ],
  },
  {
    id: 'voice',
    label: 'Salons Vocaux',
    permissions: [
      { key: 'connect_voice', label: 'Se connecter', description: 'Rejoindre les salons vocaux' },
      { key: 'speak_voice', label: 'Parler', description: 'Parler dans les salons vocaux' },
      { key: 'video', label: 'Vidéo', description: 'Partager sa caméra' },
      { key: 'stream', label: 'Diffuser', description: 'Partager son écran' },
      { key: 'use_voice_activity', label: 'Détection vocale', description: 'Utiliser la détection automatique de la voix' },
      { key: 'priority_speaker', label: 'Orateur prioritaire', description: 'Être entendu plus clairement' },
      { key: 'mute_members', label: 'Rendre muet', description: 'Couper le micro des autres membres' },
      { key: 'deafen_members', label: 'Rendre sourd', description: 'Couper le son des autres membres' },
      { key: 'move_members', label: 'Déplacer des membres', description: 'Déplacer des membres vers d\'autres salons' },
      { key: 'use_soundboard', label: 'Soundboard', description: 'Utiliser les effets sonores' },
      { key: 'use_external_sounds', label: 'Sons externes', description: 'Utiliser des sons d\'autres serveurs' },
      { key: 'use_embedded_activities', label: 'Activités', description: 'Utiliser les activités intégrées' },
    ],
  },
  {
    id: 'stage',
    label: 'Conférences',
    permissions: [
      { key: 'start_stage_session', label: 'Démarrer une session', description: 'Lancer une conférence' },
      { key: 'end_stage_session', label: 'Terminer une session', description: 'Mettre fin à une conférence' },
      { key: 'become_speaker', label: 'Devenir orateur', description: 'Prendre la parole sur scène' },
      { key: 'request_to_speak', label: 'Demander la parole', description: 'Lever la main pour parler' },
      { key: 'invite_stage_speaker', label: 'Inviter des orateurs', description: 'Inviter des membres à parler' },
      { key: 'moderate_stage', label: 'Modérer la scène', description: 'Gérer les orateurs et l\'audience' },
      { key: 'mute_members', label: 'Rendre muet', description: 'Couper le micro des orateurs' },
      { key: 'move_members', label: 'Déplacer des membres', description: 'Déplacer entre scène et audience' },
      { key: 'start_embedded_activities', label: 'Activités de scène', description: 'Lancer des activités partagées' },
      { key: 'connect_voice', label: 'Rejoindre l\'audience', description: 'Rejoindre en tant que spectateur' },
    ],
  },
  {
    id: 'forum',
    label: 'Forums',
    permissions: [
      { key: 'create_forum_posts', label: 'Créer des posts', description: 'Créer de nouveaux sujets de discussion' },
      { key: 'send_messages', label: 'Répondre aux posts', description: 'Commenter les sujets existants' },
      { key: 'manage_forum_posts', label: 'Gérer les posts', description: 'Modifier et supprimer les posts' },
      { key: 'pin_forum_posts', label: 'Épingler des posts', description: 'Mettre en avant des sujets' },
      { key: 'archive_forum_posts', label: 'Archiver des posts', description: 'Archiver les sujets inactifs' },
      { key: 'lock_forum_posts', label: 'Verrouiller des posts', description: 'Empêcher les nouvelles réponses' },
      { key: 'add_forum_tags', label: 'Ajouter des tags', description: 'Taguer les posts existants' },
      { key: 'manage_forum_tags', label: 'Gérer les tags', description: 'Créer et supprimer les tags' },
      { key: 'moderate_forum', label: 'Modérer le forum', description: 'Modération complète du forum' },
      { key: 'add_reactions', label: 'Réactions', description: 'Réagir aux messages du forum' },
    ],
  },
  {
    id: 'announcement',
    label: 'Annonces',
    permissions: [
      { key: 'create_announcements', label: 'Créer des annonces', description: 'Publier de nouvelles annonces' },
      { key: 'edit_announcements', label: 'Modifier les annonces', description: 'Éditer les annonces existantes' },
      { key: 'delete_announcements', label: 'Supprimer les annonces', description: 'Supprimer des annonces' },
      { key: 'publish_messages', label: 'Publier vers d\'autres serveurs', description: 'Diffuser vers les serveurs suiveurs' },
      { key: 'follow_announcements', label: 'Suivre les annonces', description: 'Configurer le suivi des annonces' },
      { key: 'pin_announcements', label: 'Épingler des annonces', description: 'Mettre en avant des annonces' },
      { key: 'feature_announcements', label: 'Mettre en vedette', description: 'Afficher en évidence' },
      { key: 'moderate_announcements', label: 'Modérer les annonces', description: 'Modération complète' },
      { key: 'view_announcement_analytics', label: 'Voir les statistiques', description: 'Accéder aux analytics' },
      { key: 'manage_announcements', label: 'Gérer les annonces', description: 'Administration complète des annonces' },
    ],
  },
  {
    id: 'media',
    label: 'Médias',
    permissions: [
      { key: 'upload_media', label: 'Téléverser des médias', description: 'Ajouter des images et vidéos' },
      { key: 'download_media', label: 'Télécharger des médias', description: 'Télécharger les fichiers' },
      { key: 'create_albums', label: 'Créer des albums', description: 'Organiser les médias en albums' },
      { key: 'delete_albums', label: 'Supprimer des albums', description: 'Supprimer des albums existants' },
      { key: 'organize_media', label: 'Organiser les médias', description: 'Déplacer et trier les fichiers' },
      { key: 'tag_media', label: 'Taguer les médias', description: 'Ajouter des tags aux fichiers' },
      { key: 'share_media', label: 'Partager les médias', description: 'Partager vers d\'autres salons' },
      { key: 'manage_media', label: 'Gérer les médias', description: 'Administration des fichiers' },
      { key: 'moderate_media', label: 'Modérer les médias', description: 'Supprimer le contenu inapproprié' },
      { key: 'view_media_analytics', label: 'Voir les statistiques', description: 'Accéder aux analytics' },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    permissions: [
      { key: 'view_events', label: 'Voir les événements', description: 'Consulter le calendrier' },
      { key: 'create_events', label: 'Créer des événements', description: 'Ajouter de nouveaux événements' },
      { key: 'edit_events', label: 'Modifier les événements', description: 'Éditer les événements existants' },
      { key: 'delete_events', label: 'Supprimer des événements', description: 'Supprimer des événements' },
      { key: 'rsvp_events', label: 'Participer aux événements', description: 'S\'inscrire aux événements' },
      { key: 'invite_to_events', label: 'Inviter aux événements', description: 'Inviter des membres' },
      { key: 'manage_event_rsvps', label: 'Gérer les inscriptions', description: 'Modifier la liste des participants' },
      { key: 'create_recurring_events', label: 'Événements récurrents', description: 'Créer des événements répétitifs' },
      { key: 'manage_events', label: 'Gérer les événements', description: 'Administration complète' },
      { key: 'moderate_events', label: 'Modérer les événements', description: 'Modération du calendrier' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tâches',
    permissions: [
      { key: 'view_tasks', label: 'Voir les tâches', description: 'Consulter la liste des tâches' },
      { key: 'create_tasks', label: 'Créer des tâches', description: 'Ajouter de nouvelles tâches' },
      { key: 'edit_tasks', label: 'Modifier les tâches', description: 'Éditer les tâches existantes' },
      { key: 'delete_tasks', label: 'Supprimer des tâches', description: 'Supprimer des tâches' },
      { key: 'assign_tasks', label: 'Assigner des tâches', description: 'Attribuer des tâches aux membres' },
      { key: 'complete_tasks', label: 'Compléter les tâches', description: 'Marquer comme terminé' },
      { key: 'reopen_tasks', label: 'Rouvrir les tâches', description: 'Remettre en cours' },
      { key: 'create_task_lists', label: 'Créer des listes', description: 'Organiser en listes' },
      { key: 'manage_task_lists', label: 'Gérer les listes', description: 'Modifier et supprimer les listes' },
      { key: 'manage_tasks', label: 'Gérer les tâches', description: 'Administration complète' },
    ],
  },
  {
    id: 'polls',
    label: 'Sondages',
    permissions: [
      { key: 'create_polls', label: 'Créer des sondages', description: 'Lancer de nouveaux sondages' },
      { key: 'vote_in_polls', label: 'Voter', description: 'Participer aux sondages' },
      { key: 'view_poll_results', label: 'Voir les résultats', description: 'Consulter les résultats' },
      { key: 'view_poll_voters', label: 'Voir les votants', description: 'Voir qui a voté' },
      { key: 'edit_polls', label: 'Modifier les sondages', description: 'Éditer les sondages en cours' },
      { key: 'delete_polls', label: 'Supprimer les sondages', description: 'Supprimer des sondages' },
      { key: 'end_polls', label: 'Terminer les sondages', description: 'Clôturer un sondage' },
      { key: 'create_anonymous_polls', label: 'Sondages anonymes', description: 'Créer des sondages anonymes' },
      { key: 'manage_polls', label: 'Gérer les sondages', description: 'Administration des sondages' },
      { key: 'moderate_polls', label: 'Modérer les sondages', description: 'Modération complète' },
    ],
  },
];

// Map channel types to relevant permission categories
export const CHANNEL_TYPE_CATEGORIES: Record<ChannelType, string[]> = {
  text: ['general', 'text', 'threads', 'polls'],
  voice: ['general', 'voice', 'text'],
  forum: ['general', 'forum', 'threads'],
  announcement: ['general', 'announcement'],
  media: ['general', 'media'],
  calendar: ['general', 'calendar'],
  tasks: ['general', 'tasks'],
  stage: ['general', 'stage', 'voice'],
};

// Category permissions use general + moderation categories
export const CATEGORY_PERMISSION_CATEGORIES = ['general', 'moderation', 'text', 'voice'];

// Role permissions use all categories
export const ROLE_PERMISSION_CATEGORIES = [
  'general', 'moderation', 'text', 'threads', 'voice', 'stage', 
  'forum', 'announcement', 'media', 'calendar', 'tasks', 'polls'
];

// Helper to get permissions for a specific channel type
export function getPermissionsForChannelType(channelType: ChannelType): PermissionCategory[] {
  const categoryIds = CHANNEL_TYPE_CATEGORIES[channelType] || ['general', 'text'];
  return PERMISSION_CATEGORIES.filter(cat => categoryIds.includes(cat.id));
}

// Helper to get permissions for categories
export function getCategoryPermissions(): PermissionCategory[] {
  return PERMISSION_CATEGORIES.filter(cat => CATEGORY_PERMISSION_CATEGORIES.includes(cat.id));
}

// Helper to get all role permissions
export function getRolePermissions(): PermissionCategory[] {
  return PERMISSION_CATEGORIES.filter(cat => ROLE_PERMISSION_CATEGORIES.includes(cat.id));
}

// Flat list of all permissions (for backward compatibility)
export const ALL_PERMISSIONS: PermissionInfo[] = PERMISSION_CATEGORIES.flatMap(cat => cat.permissions);

// Get permission info by key
export function getPermissionInfo(key: ServerPermission): PermissionInfo | undefined {
  return ALL_PERMISSIONS.find(p => p.key === key);
}
