import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

  const query = useQuery({
    queryKey: ['friends', user?.id],
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:friends:${user?.id}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
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
      }).filter(f => f.profile);
    },
    enabled: !!user,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && user?.id && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:friends:${user.id}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, user?.id, query.isPlaceholderData]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`friendships:${user.id}`)
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
      toast.success('Demande d\'ami envoyée !');
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
      toast.success('Demande d\'ami acceptée !');
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
      toast.success('Demande refusée');
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
      toast.success('Ami supprimé');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
