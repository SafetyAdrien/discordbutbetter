import { Server, User, Message, Category, Channel } from '@/types/app';

export const currentUser: User = {
  id: 'user-1',
  username: 'cyberpunk_player',
  displayName: 'CyberPunk',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  status: 'online',
  customStatus: '🎮 En train de jouer',
};

export const users: User[] = [
  currentUser,
  {
    id: 'user-2',
    username: 'shadow_hunter',
    displayName: 'ShadowHunter',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    status: 'online',
  },
  {
    id: 'user-3',
    username: 'pixel_master',
    displayName: 'PixelMaster',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Peanut',
    status: 'idle',
    customStatus: '☕ AFK',
  },
  {
    id: 'user-4',
    username: 'neon_warrior',
    displayName: 'NeonWarrior',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Missy',
    status: 'dnd',
    customStatus: '🔴 Ne pas déranger',
  },
  {
    id: 'user-5',
    username: 'ghost_rider',
    displayName: 'GhostRider',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tiger',
    status: 'offline',
  },
];

const createChannels = (): Category[] => [
  {
    id: 'cat-1',
    name: 'INFORMATIONS',
    channels: [
      { id: 'ch-1', name: '📢 annonces', type: 'announcement' },
      { id: 'ch-2', name: '📜 règlement', type: 'text' },
      { id: 'ch-3', name: '👋 bienvenue', type: 'text' },
    ],
  },
  {
    id: 'cat-2',
    name: 'GÉNÉRAL',
    channels: [
      { id: 'ch-4', name: '💬 discussion', type: 'text', unreadCount: 5 },
      { id: 'ch-5', name: '🎮 gaming', type: 'text', unreadCount: 12 },
      { id: 'ch-6', name: '🎵 musique', type: 'text' },
      { id: 'ch-7', name: '🖼️ médias', type: 'text' },
    ],
  },
  {
    id: 'cat-3',
    name: 'VOCAL',
    channels: [
      { id: 'ch-8', name: '🔊 Salon Général', type: 'voice' },
      { id: 'ch-9', name: '🎮 Gaming Squad', type: 'voice' },
      { id: 'ch-10', name: '🎤 Stream Zone', type: 'voice' },
    ],
  },
  {
    id: 'cat-4',
    name: 'COMMUNAUTÉ',
    channels: [
      { id: 'ch-11', name: '💡 suggestions', type: 'forum' },
      { id: 'ch-12', name: '❓ support', type: 'forum' },
    ],
  },
];

export const servers: Server[] = [
  {
    id: 'server-1',
    name: 'Gaming Hub',
    icon: '🎮',
    ownerId: 'user-1',
    description: 'La communauté gaming ultime',
    memberCount: 15420,
    isPublic: true,
    categories: createChannels(),
  },
  {
    id: 'server-2',
    name: 'Esport Arena',
    icon: '🏆',
    ownerId: 'user-2',
    description: 'Compétitions et tournois',
    memberCount: 8750,
    isPublic: true,
    categories: createChannels(),
  },
  {
    id: 'server-3',
    name: 'Pixel Art',
    icon: '🎨',
    ownerId: 'user-3',
    description: 'Créateurs et artistes',
    memberCount: 3200,
    isPublic: false,
    categories: createChannels(),
  },
  {
    id: 'server-4',
    name: 'Music Lounge',
    icon: '🎵',
    ownerId: 'user-4',
    description: 'Partage musical',
    memberCount: 12000,
    isPublic: true,
    categories: createChannels(),
  },
  {
    id: 'server-5',
    name: 'Dev Zone',
    icon: '💻',
    ownerId: 'user-1',
    description: 'Développeurs et codeurs',
    memberCount: 6500,
    isPublic: true,
    categories: createChannels(),
  },
];

export const discoverServers: Server[] = [
  {
    id: 'discover-1',
    name: 'Valorant France',
    icon: '🎯',
    ownerId: 'user-2',
    description: 'La plus grande communauté Valorant francophone',
    memberCount: 45000,
    isPublic: true,
    categories: [],
  },
  {
    id: 'discover-2',
    name: 'Minecraft Builders',
    icon: '⛏️',
    ownerId: 'user-3',
    description: 'Construisez ensemble des mondes incroyables',
    memberCount: 28000,
    isPublic: true,
    categories: [],
  },
  {
    id: 'discover-3',
    name: 'League of Legends EU',
    icon: '⚔️',
    ownerId: 'user-4',
    description: 'Communauté LoL européenne active',
    memberCount: 67000,
    isPublic: true,
    categories: [],
  },
  {
    id: 'discover-4',
    name: 'Indie Game Devs',
    icon: '🕹️',
    ownerId: 'user-5',
    description: 'Développeurs de jeux indépendants',
    memberCount: 12500,
    isPublic: true,
    categories: [],
  },
  {
    id: 'discover-5',
    name: 'Anime & Gaming',
    icon: '🌸',
    ownerId: 'user-2',
    description: 'Pour les fans d\'anime et de jeux japonais',
    memberCount: 89000,
    isPublic: true,
    categories: [],
  },
  {
    id: 'discover-6',
    name: 'Streamers Hub',
    icon: '📺',
    ownerId: 'user-3',
    description: 'Communauté de streamers et viewers',
    memberCount: 34000,
    isPublic: true,
    categories: [],
  },
];

export const messages: Message[] = [
  {
    id: 'msg-1',
    content: 'Salut tout le monde ! Qui est chaud pour une game ce soir ? 🎮',
    author: users[1],
    timestamp: new Date(Date.now() - 3600000),
    reactions: [
      { emoji: '👍', count: 5, users: ['user-2', 'user-3'] },
      { emoji: '🎮', count: 3, users: ['user-4'] },
    ],
  },
  {
    id: 'msg-2',
    content: 'Je suis dispo à partir de 21h ! On peut faire du ranked ?',
    author: users[2],
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: 'msg-3',
    content: 'Parfait, je créé le lobby. Rejoignez le vocal "Gaming Squad" 🔊',
    author: users[1],
    timestamp: new Date(Date.now() - 2400000),
  },
  {
    id: 'msg-4',
    content: 'GG la game de tout à l\'heure les gars ! C\'était incroyable cette clutch 🔥',
    author: users[3],
    timestamp: new Date(Date.now() - 1800000),
    reactions: [
      { emoji: '🔥', count: 8, users: [] },
      { emoji: '💪', count: 4, users: [] },
    ],
  },
  {
    id: 'msg-5',
    content: 'Quelqu\'un a vu la nouvelle mise à jour ? Ils ont ajouté une nouvelle map !',
    author: currentUser,
    timestamp: new Date(Date.now() - 1200000),
  },
  {
    id: 'msg-6',
    content: 'Oui ! La map a l\'air ouf, j\'ai hâte de la tester. On la découvre ensemble demain ?',
    author: users[1],
    timestamp: new Date(Date.now() - 600000),
    reactions: [
      { emoji: '✅', count: 6, users: [] },
    ],
  },
  {
    id: 'msg-7',
    content: 'Je pose ça ici : les nouveaux skins sont magnifiques 💜',
    author: users[2],
    timestamp: new Date(Date.now() - 300000),
  },
];
