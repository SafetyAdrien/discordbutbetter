import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useIsFollowingThread = (threadId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['thread-follow', threadId, user?.id],
    queryFn: async () => {
      if (!threadId || !user) return false;
      
      const { data, error } = await supabase
        .from('thread_followers')
        .select('id')
        .eq('thread_id', threadId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!threadId && !!user,
  });
};

export const useFollowThread = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('thread_followers')
        .insert({
          thread_id: threadId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (threadId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['thread-follow', threadId, user.id] });
      const previousFollow = queryClient.getQueryData(['thread-follow', threadId, user.id]);
      
      queryClient.setQueryData(['thread-follow', threadId, user.id], true);
      
      return { previousFollow, threadId };
    },
    onError: (_, threadId, context) => {
      if (context?.previousFollow !== undefined && user) {
        queryClient.setQueryData(['thread-follow', threadId, user.id], context.previousFollow);
      }
      toast.error('Erreur lors du suivi du thread');
    },
    onSuccess: () => {
    },
    onSettled: (_, __, threadId) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['thread-follow', threadId, user.id] });
        queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
        queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
      }
    },
  });
};

export const useUnfollowThread = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('thread_followers')
        .delete()
        .eq('thread_id', threadId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { threadId };
    },
    onMutate: async (threadId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['thread-follow', threadId, user.id] });
      const previousFollow = queryClient.getQueryData(['thread-follow', threadId, user.id]);
      
      queryClient.setQueryData(['thread-follow', threadId, user.id], false);
      
      return { previousFollow, threadId };
    },
    onError: (_, threadId, context) => {
      if (context?.previousFollow !== undefined && user) {
        queryClient.setQueryData(['thread-follow', threadId, user.id], context.previousFollow);
      }
      toast.error('Erreur lors de l\'arrêt du suivi');
    },
    onSuccess: () => {
    },
    onSettled: (_, __, threadId) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['thread-follow', threadId, user.id] });
        queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
        queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
      }
    },
  });
};

/*
 * Preferences de notification d'un fil (colonnes notification_level / muted_until de thread_followers) :
 * "Tous les messages", "@mentions seulement", "Aucun message", et mise en sourdine temporaire.
 * Suivre un fil est requis : sans ligne de suivi, le niveau par defaut ("all") s'applique.
 */
export type ThreadNotificationLevel = 'all' | 'mentions' | 'none';

export interface ThreadNotificationPrefs {
  level: ThreadNotificationLevel;
  mutedUntil: string | null;
}

export const MUTE_FOREVER = '9999-12-31T00:00:00.000Z';

export const isThreadMuted = (p: ThreadNotificationPrefs | undefined, now = Date.now()) =>
  !!p?.mutedUntil && new Date(p.mutedUntil).getTime() > now;

export const useThreadNotificationPrefs = (threadId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['thread-notification-prefs', threadId, user?.id],
    enabled: !!threadId && !!user,
    queryFn: async (): Promise<ThreadNotificationPrefs> => {
      const { data, error } = await (supabase as any)
        .from('thread_followers')
        .select('notification_level, muted_until')
        .eq('thread_id', threadId)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return { level: (data?.notification_level ?? 'all') as ThreadNotificationLevel, mutedUntil: data?.muted_until ?? null };
    },
  });
};

export const useSetThreadNotificationPrefs = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ threadId, level, mutedUntil }: { threadId: string; level?: ThreadNotificationLevel; mutedUntil?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      const patch: Record<string, unknown> = {};
      if (level !== undefined) patch.notification_level = level;
      if (mutedUntil !== undefined) patch.muted_until = mutedUntil;
      // Regler une preference suppose de suivre le fil : la ligne est creee au besoin.
      const { error } = await (supabase as any)
        .from('thread_followers')
        .upsert({ thread_id: threadId, user_id: user.id, ...patch }, { onConflict: 'thread_id,user_id' });
      if (error) throw error;
    },
    onMutate: ({ threadId, level, mutedUntil }) => {
      const key = ['thread-notification-prefs', threadId, user?.id];
      const prev = queryClient.getQueryData<ThreadNotificationPrefs>(key);
      queryClient.setQueryData<ThreadNotificationPrefs>(key, {
        level: level ?? prev?.level ?? 'all',
        mutedUntil: mutedUntil !== undefined ? mutedUntil : prev?.mutedUntil ?? null,
      });
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.prev);
      toast.error('Impossible de modifier les notifications du fil');
    },
    onSettled: (_d, _e, { threadId }) => {
      void queryClient.invalidateQueries({ queryKey: ['thread-follow', threadId, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
    },
  });
};
