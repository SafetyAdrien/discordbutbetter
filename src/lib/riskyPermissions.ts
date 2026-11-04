import type { ServerPermission } from "@/hooks/useRoles";

/** Permissions jugees risquees pour @everyone (Communaute, Configuration de Securite). */
export const RISKY_PERMISSIONS: { id: ServerPermission; label: string }[] = [
  { id: "administrator", label: "Administrateur" },
  { id: "manage_server", label: "Gérer le serveur" },
  { id: "manage_roles", label: "Gérer les rôles" },
  { id: "manage_channels", label: "Gérer les salons" },
  { id: "kick_members", label: "Expulser des membres" },
  { id: "ban_members", label: "Bannir des membres" },
  { id: "manage_messages", label: "Gérer les messages" },
  { id: "manage_emojis", label: "Gérer les émojis" },
  { id: "manage_events", label: "Gérer les événements" },
  { id: "manage_webhooks", label: "Gérer les webhooks" },
  { id: "mention_everyone", label: "Mentionner @everyone" },
];
