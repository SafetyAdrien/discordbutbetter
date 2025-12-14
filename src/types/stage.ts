export type StageStatus = 'pre_live' | 'live' | 'ended';
export type StageRole = 'speaker' | 'audience' | 'moderator';
export type HandRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StageSession {
  id: string;
  channel_id: string;
  status: StageStatus;
  title?: string;
  description?: string;
  started_at?: string;
  ended_at?: string;
  started_by?: string;
  created_at: string;
}

export interface StageParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: StageRole;
  is_muted: boolean;
  is_video_on: boolean;
  joined_at: string;
  profile?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface StageHandRequest {
  id: string;
  session_id: string;
  user_id: string;
  status: HandRequestStatus;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  profile?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}
