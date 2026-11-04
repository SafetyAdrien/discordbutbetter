/**
 * Fixtures du harnais de design (/design).
 *
 * Données fictives, aucune dépendance réseau. Reproduit la structure visible
 * dans l'app réelle : une barre de serveurs, un serveur avec catégories et
 * salons de plusieurs types, une liste de membres avec rôles et statuts, et
 * un fil de messages.
 *
 * Sert à deux choses :
 *  1. vérifier visuellement le restyle sans passer par l'authentification ;
 *  2. servir de référence de valeurs pour les cotes de composants.
 */
import type { Category, Channel, Message, Server, User } from "@/types/app";

const now = Date.now();
const iso = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();

/* ------------------------------------------------------------- serveurs -- */

export const SERVERS: Server[] = [
  {
    id: "s1",
    name: "Adrien_Sama",
    ownerId: "u1",
    memberCount: 1284,
    isPublic: false,
    banner: undefined,
    categories: [],
  },
  { id: "s2", name: "Communauté A", ownerId: "u1", memberCount: 342, isPublic: false, categories: [] },
  { id: "s3", name: "Design", ownerId: "u1", memberCount: 57, isPublic: true, categories: [] },
  { id: "s4", name: "Gaming", ownerId: "u2", memberCount: 890, isPublic: true, categories: [] },
  { id: "s5", name: "Dev", ownerId: "u1", memberCount: 23, isPublic: true, categories: [] },
];

/* ------------------------------------------------------------ catégories -- */

const ch = (
  id: string,
  name: string,
  type: Channel["type"],
  unreadCount?: number
): Channel => ({ id, name, type, unreadCount, server_id: "s1" });

export const CATEGORIES: Category[] = [
  {
    id: "c1",
    name: "Feeds",
    icon: null,
    channels: [
      ch("ch-1", "Accueil", "text"),
      ch("ch-2", "Serveur", "announcement", 3),
      ch("ch-3", "Animations", "media", 12),
      ch("ch-4", "Skeets", "text", 1),
      ch("ch-5", "Polls", "text"),
    ],
  },
  {
    id: "c2",
    name: "Events",
    icon: null,
    channels: [
      ch("ch-6", "Animation", "text"),
      ch("ch-7", "Starship Vol 14", "text"),
      ch("ch-8", "Salon vocal", "voice"),
    ],
  },
  {
    id: "c3",
    name: "Communauté",
    icon: null,
    channels: [
      ch("ch-9", "Général", "text"),
      ch("ch-10", "Médias", "media"),
      ch("ch-11", "Sujet", "forum"),
      ch("ch-12", "Commandes", "text", 2),
      ch("ch-13", "Présentations", "stage"),
    ],
  },
];

export const SERVER: Server = { ...SERVERS[0], categories: CATEGORIES };
export const ACTIVE_CHANNEL_ID = "ch-9";

/* -------------------------------------------------------------- membres -- */

/** Aligne sur le `Role` local de MemberList : color et position obligatoires. */
export interface HarnessRole {
  id: string;
  name: string;
  color: string | null;
  position: number | null;
  icon_url?: string | null;
}

export interface HarnessMember extends User {
  memberId: string;
  roles: HarnessRole[];
  activity_type?: string | null;
  activity_text?: string | null;
}

const m = (
  id: string,
  username: string,
  displayName: string,
  status: User["status"],
  roles: HarnessRole[] = [],
  extra: Partial<HarnessMember> = {}
): HarnessMember => ({ id, username, displayName, status, memberId: `m-${id}`, roles, ...extra });

const ROLE_ADMIN: HarnessRole = { id: "r1", name: "Admin", color: "#f23f43", position: 10 };
const ROLE_MOD: HarnessRole = { id: "r2", name: "Modérateur", color: "#23a55a", position: 8, icon_url: "🛡️" };
const ROLE_DEV: HarnessRole = { id: "r3", name: "Développeur", color: "#5865f2", position: 6, icon_url: "https://cdn.discordapp.com/emojis/1112440133838487623.webp?size=64" };
const ROLE_NITRO: HarnessRole = { id: "r4", name: "Nitro", color: "#f0b232", position: 4 };
const ROLE_DEFAULT: HarnessRole = { id: "r0", name: "@everyone", color: null, position: 0 };

export const MEMBERS: HarnessMember[] = [
  m("u1", "adrien", "Adrien_Sama", "online", [ROLE_ADMIN, ROLE_NITRO, ROLE_DEFAULT]),
  m("u2", "lea", "Léa", "online", [ROLE_MOD, ROLE_NITRO, ROLE_DEFAULT], {
    activity_type: "playing",
    activity_text: "Stardew Valley",
  }),
  m("u3", "thomas", "Thomas", "idle", [ROLE_DEV, ROLE_DEFAULT]),
  m("u4", "sarah", "Sarah", "dnd", [ROLE_NITRO, ROLE_DEFAULT]),
  m("u5", "maxime", "Maxime", "online", [ROLE_DEFAULT]),
  m("u6", "julien", "Julien", "offline", [ROLE_DEFAULT]),
  m("u7", "nina", "Nina", "online", [ROLE_DEV, ROLE_MOD, ROLE_DEFAULT]),
  m("u8", "antoine", "Antoine", "idle", [ROLE_DEFAULT]),
  m("u9", "camille", "Camille", "online", [ROLE_NITRO, ROLE_DEFAULT], {
    activity_type: "listening",
    activity_text: "Lo-fi",
  }),
  m("u10", "lucas", "Lucas", "offline", [ROLE_DEFAULT]),
];

export const OWNER_ID = "u1";

/* ------------------------------------------------------------- messages -- */

const user = (id: string, username: string, displayName: string, status: User["status"]): User => ({
  id,
  username,
  displayName,
  status,
});

export const U_ADRIEN = user("u1", "adrien", "Adrien_Sama", "online");
const U_LEA = user("u2", "lea", "Léa", "online");
const U_THOMAS = user("u3", "thomas", "Thomas", "idle");
const U_NINA = user("u7", "nina", "Nina", "online");

export const MESSAGES: Message[] = [
  {
    id: "m1",
    content: "Salut tout le monde ! Le nouveau design est enfin en ligne.",
    author: U_LEA,
    timestamp: new Date(iso(42)),
    reactions: [{ emoji: "🎉", count: 4, users: ["u1", "u3", "u7", "u9"] }],
  },
  {
    id: "m2",
    content: "Il rend vraiment bien, j'ai comparé avec la version officielle.",
    author: U_THOMAS,
    timestamp: new Date(iso(38)),
    replyToId: "m1",
    repliedMessage: {
      id: "m1",
      content: "Salut tout le monde ! Le nouveau design est enfin en ligne.",
      author: { id: "u2", username: "lea", displayName: "Léa" },
    },
  },
  {
    id: "m3",
    content:
      "C'est pas mal, mais la **liste des membres** est un peu large. On devrait la resserrer.",
    author: U_ADRIEN,
    timestamp: new Date(iso(31)),
    reactions: [
      { emoji: "👍", count: 3, users: ["u2", "u3", "u7"] },
      { emoji: "💡", count: 1, users: ["u7"] },
    ],
  },
  {
    id: "m4",
    content: "Je regarde ça demain matin.",
    author: U_NINA,
    timestamp: new Date(iso(12)),
  },
  {
    id: "m5",
    content: "https://discord.gg/fr",
    author: U_NINA,
    timestamp: new Date(iso(2)),
  },
  {
    id: "m6",
    content: "Rejoins aussi le nôtre : http://localhost:8080/invite/design",
    author: U_THOMAS,
    timestamp: new Date(iso(1)),
  },
];

/* --------------------------------------------------------------- salons -- */

export const ACTIVE_CHANNEL: Channel = CATEGORIES[2].channels[0];