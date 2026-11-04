import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FriendWithProfile {
  id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string | null;
  user_id: string;
  friend_id: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    status: 'online' | 'idle' | 'dnd' | 'offline' | null;
    custom_status: string | null;
  };
  isIncoming: boolean;
}

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const query = useQuery({
    queryKey: ['friends', user?.id],
    placeholderData: () => cacheGetSync(`friends:${user?.id}`),
    queryFn: async (): Promise<FriendWithProfile[]> => {
      if (!user) return [];

      // Get friendships where user is either sender or receiver
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          user_id,
          friend_id
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      // Fetch profiles for all friends using RPC to bypass RLS for pending requests
      const friendIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      
      if (friendIds.length === 0) return [];
      
      const { data: profiles, error: profileError } = await supabase
        .rpc('get_friendship_profiles', { friendship_user_ids: friendIds });

      if (profileError) throw profileError;

      // Combine data
      return data.map(friendship => {
        const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
        const profile = profiles?.find(p => p.id === friendId);
        return {
          ...friendship,
          profile: profile as FriendWithProfile['profile'],
          isIncoming: friendship.friend_id === user.id,
        };
      }).filter(f => f.profile && !(f.status === 'blocked' && f.friend_id === user.id));
    },
    enabled: !!user,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && user?.id && !query.isPlaceholderData) {
      cacheSetAsync(`friends:${user.id}`, query.data);
    }
  }, [query.data, user?.id, query.isPlaceholderData]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`friendships:${user.id}-${instanceIdRef.current}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friends', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useSendFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!user) throw new Error('Not authenticated');

      // Nettoyer le username : retirer le @ au début et normaliser
      const cleanUsername = username.replace(/^@/, '').trim();

      // Utiliser la fonction RPC sécurisée pour trouver l'utilisateur
      const { data: targetUsers, error: findError } = await supabase
        .rpc('find_user_for_friend_request', { target_username: cleanUsername });

      if (findError) {
        throw new Error('Erreur lors de la recherche');
      }

      const targetUser = targetUsers?.[0];

      if (!targetUser) {
        throw new Error('Utilisateur non trouvé');
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .single();

      if (existing) {
        if (existing.status === 'accepted') {
          throw new Error('Vous êtes déjà amis');
        }
        if (existing.status === 'pending') {
          throw new Error('Une demande est déjà en cours');
        }
        if (existing.status === 'blocked') {
          throw new Error('Impossible d\'envoyer une demande');
        }
      }

      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUser.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, targetProfile: targetUser };
    },
    onMutate: async (username) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['friends', user.id] });
      const previousFriends = queryClient.getQueryData(['friends', user.id]);
      
      return { previousFriends };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', user?.id], context.previousFriends);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useAcceptFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
        .eq('friend_id', user.id) // Only receiver can accept
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (friendshipId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['friends', user.id] });
      const previousFriends = queryClient.getQueryData(['friends', user.id]);
      
      queryClient.setQueryData(['friends', user.id], (old: FriendWithProfile[] | undefined) =>
        old?.map(f => f.id === friendshipId ? { ...f, status: 'accepted' as const } : f)
      );
      
      return { previousFriends };
    },
    onError: (_, __, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', user?.id], context.previousFriends);
      }
      toast.error('Erreur lors de l\'acceptation');
    },
    onSuccess: () => {
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useDeclineFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
    },
    onMutate: async (friendshipId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['friends', user.id] });
      const previousFriends = queryClient.getQueryData(['friends', user.id]);
      
      queryClient.setQueryData(['friends', user.id], (old: FriendWithProfile[] | undefined) =>
        old?.filter(f => f.id !== friendshipId)
      );
      
      return { previousFriends };
    },
    onError: (_, __, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', user?.id], context.previousFriends);
      }
      toast.error('Erreur lors du refus');
    },
    onSuccess: () => {
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useRemoveFriend() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
    },
    onMutate: async (friendshipId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['friends', user.id] });
      const previousFriends = queryClient.getQueryData(['friends', user.id]);
      
      queryClient.setQueryData(['friends', user.id], (old: FriendWithProfile[] | undefined) =>
        old?.filter(f => f.id !== friendshipId)
      );
      
      return { previousFriends };
    },
    onError: (_, __, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', user?.id], context.previousFriends);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

/**
 * Bloque un utilisateur : l'eventuelle amitie / demande est supprimee puis une ligne `blocked` (bloqueur -> bloque)
 * la remplace. La personne bloquee ne la voit pas dans sa liste (voir `useFriends`).
 */
export function useBlockUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: string | { id: string; name?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const targetId = typeof target === 'string' ? target : target.id;
      const { error: delError } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id})`);
      if (delError) throw delError;
      const { error } = await supabase.from('friendships').insert({ user_id: user.id, friend_id: targetId, status: 'blocked' });
      if (error) throw error;
      return typeof target === 'string' ? undefined : target.name;
    },
    onSuccess: (name) => toast.success(name ? `${name} est bloqué` : 'Utilisateur bloqué'),
    onError: () => toast.error('Impossible de bloquer cet utilisateur'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useUnblockUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('friendships').delete().eq('user_id', user.id).eq('friend_id', targetId).eq('status', 'blocked');
      if (error) throw error;
    },
    onError: () => toast.error('Impossible de débloquer cet utilisateur'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

/** Etat de la relation avec un utilisateur : ami, demande, bloque par moi. */
export function useRelationTo(targetId: string | null | undefined) {
  const { user } = useAuth();
  const { data: friends = [] } = useFriends();
  const row = targetId ? friends.find((f) => f.profile.id === targetId) : undefined;
  return {
    row,
    isFriend: row?.status === 'accepted',
    isPending: row?.status === 'pending',
    isBlocked: row?.status === 'blocked' && row.user_id === user?.id,
  };
}

/** Identifiants des utilisateurs que j'ai bloques. */
export function useBlockedIds() {
  const { user } = useAuth();
  const { data: friends = [] } = useFriends();
  return useMemo(() => new Set(friends.filter((f) => f.status === 'blocked' && f.user_id === user?.id).map((f) => f.profile.id)), [friends, user?.id]);
}
