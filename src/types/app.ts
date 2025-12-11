export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  bio?: string;
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  ownerId: string;
  description?: string;
  memberCount: number;
  isPublic: boolean;
  categories: Category[];
}

export interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'forum' | 'announcement';
  description?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  content: string;
  author: User;
  timestamp: Date;
  edited?: boolean;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface Attachment {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'file';
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface VoiceState {
  channelId: string | null;
  muted: boolean;
  deafened: boolean;
  streaming: boolean;
  camera: boolean;
}
