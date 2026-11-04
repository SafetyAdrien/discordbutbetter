import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ProfileConnection } from '@/lib/connections';

export interface FullProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  status: string;
  created_at: string | null;
  pronouns: string | null;
  theme_color: string | null;
  theme_gradient: string | null;
  custom_status: string | null;
  activity_type: string | null;
  activity_text: string | null;
  connections: ProfileConnection[];
}

const COLUMNS = 'id, username, display_name, avatar_url, banner_url, bio, status, created_at, pronouns, theme_color, theme_gradient, custom_status, activity_type, activity_text, connections';

/** Profil complet d'un utilisateur (pronoms, theme, connexions...), mis a jour par `useProfilesRealtime` via la cle ['profile', id]. */
export function useFullProfile(userId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', userId, 'full'],
    enabled: !!user && !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<FullProfile | null> => {
      const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, status: data.status ?? 'offline', connections: Array.isArray(data.connections) ? (data.connections as unknown as ProfileConnection[]) : [] };
    },
  });
}
