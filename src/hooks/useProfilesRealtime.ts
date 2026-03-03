import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import type { MemberWithProfile, ServerProfileData } from '@/hooks/useMembers';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ServerProfileRow = Database['public']['Tables']['server_profiles']['Row'];

/**
 * Reçoit les UPDATE sur `public.profiles` et les changements sur `public.server_profiles`
 * (postgres_changes) et met à jour instantanément les caches React Query.
 */
export function useProfilesRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Global profiles realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updated = payload.new as ProfileRow;

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

  // Server profiles realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:server_profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_profiles' },
        (payload) => {
          const isDelete = payload.eventType === 'DELETE';
          const record = (isDelete ? payload.old : payload.new) as ServerProfileRow;
          if (!record?.server_id || !record?.user_id) return;

          const { server_id, user_id } = record;

          if (isDelete) {
            // Clear individual server-profile cache
            queryClient.setQueryData(['server-profile', user_id, server_id], null);

            // Patch members cache: remove serverProfile
            queryClient.setQueryData<MemberWithProfile[]>(
              ['members', server_id],
              (old) => {
                if (!old) return old;
                let changed = false;
                const next = old.map((m) => {
                  if (m.user.id !== user_id || !m.serverProfile) return m;
                  changed = true;
                  return { ...m, serverProfile: null };
                });
                return changed ? next : old;
              },
            );
          } else {
            // INSERT or UPDATE
            const spData: ServerProfileData = {
              id: record.id,
              user_id: record.user_id,
              server_id: record.server_id,
              display_name: record.display_name,
              avatar_url: record.avatar_url,
              banner_url: record.banner_url,
              bio: record.bio,
              pronouns: record.pronouns,
            };

            // Update individual server-profile cache
            queryClient.setQueryData(['server-profile', user_id, server_id], spData);

            // Patch members cache: update serverProfile inline
            queryClient.setQueryData<MemberWithProfile[]>(
              ['members', server_id],
              (old) => {
                if (!old) return old;
                let changed = false;
                const next = old.map((m) => {
                  if (m.user.id !== user_id) return m;
                  changed = true;
                  return { ...m, serverProfile: spData };
                });
                return changed ? next : old;
              },
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
