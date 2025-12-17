import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import type { MemberWithProfile } from '@/hooks/useMembers';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Reçoit les UPDATE sur `public.profiles` (postgres_changes) et met à jour
 * instantanément les caches React Query qui contiennent des profils (ex: members list).
 */
export function useProfilesRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updated = payload.new as ProfileRow;

          // Mettre à jour toutes les listes de membres déjà en cache (tous serveurs)
          queryClient.setQueriesData({ queryKey: ['members'] }, (old) => {
            if (!Array.isArray(old)) return old;

            let changed = false;
            const next = (old as MemberWithProfile[]).map((member) => {
              if (member.user.id !== updated.id) return member;
              changed = true;
              return {
                ...member,
                user: {
                  ...member.user,
                  status: updated.status,
                  custom_status: updated.custom_status,
                  display_name: updated.display_name,
                  avatar_url: updated.avatar_url,
                  banner_url: updated.banner_url,
                  activity_type: updated.activity_type,
                  activity_text: updated.activity_text,
                  pronouns: updated.pronouns,
                },
              };
            });

            return changed ? next : old;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
