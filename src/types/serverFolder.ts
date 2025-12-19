import { Server } from './app';

export interface ServerFolder {
  id: string;
  userId: string;
  name: string;
  color: string;
  isExpanded: boolean;
  position: number;
  serverIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServerFolderDB {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_expanded: boolean;
  position: number;
  server_ids: string[];
  created_at: string;
  updated_at: string;
}

// Item in the sidebar can be either a server or a folder
export type SidebarItem = 
  | { type: 'server'; server: Server }
  | { type: 'folder'; folder: ServerFolder; servers: Server[] };

export interface FolderMergeState {
  isActive: boolean;
  targetServerId: string | null;
  sourceServerId: string | null;
  startTime: number | null;
}

// Threshold in ms for creating a folder by hovering
export const FOLDER_CREATION_THRESHOLD = 500;
