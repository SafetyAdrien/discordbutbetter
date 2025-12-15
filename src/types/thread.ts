export interface Thread {
  id: string;
  channel_id: string;
  name: string;
  created_by: string | null;
  message_id: string | null;
  created_at: string;
  archived: boolean;
  archived_at: string | null;
  last_message_at: string | null;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  message_count?: number;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  edited_at: string | null;
  attachments: any[];
  author?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}
