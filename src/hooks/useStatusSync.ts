import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MemberWithProfile } from './useMembers';

/**
 * Hook to sync status updates across all server member caches.
 * Listens to profiles table changes via postgres_changes and updates all related caches.
 */
export function useStatusSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Listen for all profile updates (status changes)
    const channel = supabase
      .channel('global-status-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updated = payload.new as any;
          
          // Update all member caches that might contain this user
          const queries = queryClient.getQueriesData<MemberWithProfile[]>({
            queryKey: ['members'],
          });

          queries.forEach(([queryKey, data]) => {
            if (!data) return;
            
            const hasUser = data.some(member => member.user.id === updated.id);
            if (hasUser) {
              queryClient.setQueryData<MemberWithProfile[]>(queryKey, (old) => {
                if (!old) return old;
                return old.map((member) =>
                  member.user.id === updated.id
                    ? {
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
                      }
                    : member
                );
              });
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
