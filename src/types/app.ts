export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  bio?: string;
  createdAt?: string;
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
  type: 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link';
  description?: string;
  unreadCount?: number;
  server_id?: string;
}

export interface Message {
  id: string;
  content: string;
  author: User;
  timestamp: Date;
  edited_at?: string | null;
  attachments?: Attachment[];
  reactions?: Reaction[];
  isSystemMessage?: boolean;
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
