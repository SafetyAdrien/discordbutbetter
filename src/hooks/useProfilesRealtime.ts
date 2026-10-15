import { useEffect, useRef } from 'react';
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
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  // Global profiles realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`public:profiles-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updated = payload.new as ProfileRow;
          const previous = payload.old as Partial<ProfileRow> | undefined;
          const uid = updated.id;
          if (!uid) return;

          // Construire un patch minimal : uniquement les champs qui ont réellement changé.
          // Si payload.old est vide (REPLICA IDENTITY DEFAULT), on patche tous les champs suivis.
          const TRACKED = [
            'status',
            'custom_status',
            'display_name',
            'avatar_url',
            'banner_url',
            'activity_type',
            'activity_text',
            'pronouns',
            'bio',
          ] as const;

          const hasOld = previous && Object.keys(previous).length > 1;
          const patch: Partial<Record<(typeof TRACKED)[number], unknown>> = {};
          for (const key of TRACKED) {
            const nextVal = (updated as any)[key];
            if (!hasOld || (previous as any)[key] !== nextVal) {
              patch[key] = nextVal;
            }
          }
          const patchKeys = Object.keys(patch) as (typeof TRACKED)[number][];
          if (patchKeys.length === 0) return;

          // Vrai si toutes les valeurs du patch sont déjà présentes sur la cible.
          const isNoop = (target: any) => {
            for (const k of patchKeys) {
              if (target?.[k] !== patch[k]) return false;
            }
            return true;
          };

          // 1. Members serveur
          queryClient.setQueriesData({ queryKey: ['members'] }, (old) => {
            if (!Array.isArray(old)) return old;
            let changed = false;
            const next = (old as MemberWithProfile[]).map((member) => {
              if (member.user.id !== uid || isNoop(member.user)) return member;
              changed = true;
              return { ...member, user: { ...member.user, ...patch } };
            });
            return changed ? next : old;
          });

          // 2. Amis
          queryClient.setQueriesData({ queryKey: ['friends'] }, (old) => {
            if (!Array.isArray(old)) return old;
            let changed = false;
            const next = (old as any[]).map((f) => {
              if (!f?.profile || f.profile.id !== uid || isNoop(f.profile)) return f;
              changed = true;
              return { ...f, profile: { ...f.profile, ...patch } };
            });
            return changed ? next : old;
          });

          // 3. Conversations DM
          queryClient.setQueriesData({ queryKey: ['dm-conversations'] }, (old) => {
            if (!Array.isArray(old)) return old;
            let changed = false;
            const next = (old as any[]).map((conv) => {
              if (!Array.isArray(conv?.participants)) return conv;
              let convChanged = false;
              const participants = conv.participants.map((p: any) => {
                if (p?.id !== uid || isNoop(p)) return p;
                convChanged = true;
                return { ...p, ...patch };
              });
              if (!convChanged) return conv;
              changed = true;
              return { ...conv, participants };
            });
            return changed ? next : old;
          });

          // 4. Profil individuel
          queryClient.setQueriesData({ queryKey: ['profile', uid] }, (old: any) => {
            if (!old || typeof old !== 'object' || isNoop(old)) return old;
            return { ...old, ...patch };
          });

          // 5. Amis communs
          queryClient.setQueriesData({ queryKey: ['mutual-friends'] }, (old) => {
            if (!Array.isArray(old)) return old;
            let changed = false;
            const next = (old as any[]).map((f) => {
              if (f?.id !== uid || isNoop(f)) return f;
              changed = true;
              return { ...f, ...patch };
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
      .channel(`public:server_profiles-${instanceIdRef.current}`)
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
