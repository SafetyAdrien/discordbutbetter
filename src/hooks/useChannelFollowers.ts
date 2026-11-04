import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export interface ChannelFollower {
  id: string;
  source_channel_id: string;
  target_channel_id: string;
  follower_user_id: string;
  created_at: string;
  /** Nom de l'annonce (auteur affiche des messages publies), sinon "<serveur> #<salon>". */
  display_name: string | null;
}

export interface ServerWithChannels {
  id: string;
  name: string;
  icon_url: string | null;
  channels: {
    id: string;
    name: string;
    type: string;
  }[];
}

// Get servers where user is admin (can manage channels)
export function useAdminServers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-servers', user?.id],
    queryFn: async (): Promise<ServerWithChannels[]> => {
      if (!user) return [];

      // Get all servers where user is member
      const { data: memberships, error: memberError } = await supabase
        .from('server_members')
        .select(`
          server:servers (
            id,
            name,
            icon_url,
            owner_id,
            channels (
              id,
              name,
              type
            )
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const servers: ServerWithChannels[] = [];

      for (const membership of memberships || []) {
        const server = membership.server as any;
        if (!server) continue;

        // Comme Discord : seuls les serveurs ou l'on peut gerer les webhooks
        // (administrateur et proprietaire compris) peuvent recevoir un abonnement.
        const isOwner = server.owner_id === user.id;
        if (!isOwner) {
          const { data: canManageWebhooks } = await supabase.rpc('has_server_permission', {
            _user_id: user.id,
            _server_id: server.id,
            _permission: 'manage_webhooks',
          });
          if (!canManageWebhooks) continue;
        }

        servers.push({
          id: server.id,
          name: server.name,
          icon_url: server.icon_url,
          channels: (server.channels || []).filter(
            (ch: any) => ch.type === 'text' || ch.type === 'announcement'
          ),
        });
      }

      return servers;
    },
    enabled: !!user,
  });
}

// Get followers for a source channel
export function useChannelFollowers(sourceChannelId: string | null) {
  return useQuery({
    queryKey: ['channel-followers', sourceChannelId],
    queryFn: async (): Promise<ChannelFollower[]> => {
      if (!sourceChannelId) return [];

      const { data, error } = await supabase
        .from('channel_followers')
        .select('*')
        .eq('source_channel_id', sourceChannelId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!sourceChannelId,
  });
}

// Follow a channel
export function useFollowChannel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceChannelId,
      targetChannelId,
    }: {
      sourceChannelId: string;
      targetChannelId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('channel_followers')
        .insert({
          source_channel_id: sourceChannelId,
          target_channel_id: targetChannelId,
          follower_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sourceChannelId }) => {
      queryClient.invalidateQueries({ queryKey: ['channel-followers', sourceChannelId] });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Ce salon suit déjà cette source');
      } else {
        toast.error('Erreur lors du suivi du salon');
      }
      console.error('Follow channel error:', error);
    },
  });
}

// Unfollow a channel
export function useUnfollowChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceChannelId,
      targetChannelId,
    }: {
      sourceChannelId: string;
      targetChannelId: string;
    }) => {
      const { error } = await supabase
        .from('channel_followers')
        .delete()
        .eq('source_channel_id', sourceChannelId)
        .eq('target_channel_id', targetChannelId);

      if (error) throw error;
    },
    onSuccess: (_, { sourceChannelId }) => {
      queryClient.invalidateQueries({ queryKey: ['channel-followers', sourceChannelId] });
      queryClient.invalidateQueries({ queryKey: ['followed-channels'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression du suivi');
      console.error('Unfollow channel error:', error);
    },
  });
}

// Publie un message d'annonce dans tous les salons abonnes (RPC : le salon
// cible peut se trouver sur un serveur dont l'auteur n'est pas membre).
export function usePublishMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string; channelId: string }) => {
      const { data, error } = await supabase.rpc('publish_announcement', { _message_id: messageId });
      if (error) throw error;
      return { count: data ?? 0 };
    },
    onSuccess: ({ count }, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      toast.success(count > 0 ? `Message publié dans ${count} salon${count > 1 ? 's' : ''} abonné${count > 1 ? 's' : ''}` : 'Message publié');
    },
    onError: (error: Error) => {
      toast.error(error.message?.includes('ALREADY_PUBLISHED') ? 'Ce message a déjà été publié' : 'Erreur lors de la publication');
    },
  });
}

// Masque l'invitation "Partage-ca avec tes abonnes !" sous un message.
export function useDismissPublishPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string; channelId: string }) => {
      const { error } = await supabase.from('messages').update({ publish_dismissed: true }).eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

export type FollowedChannelInfo = Database['public']['Functions']['get_followed_channel_info']['Returns'][number];

export interface FollowedSource extends ChannelFollower {
  source: FollowedChannelInfo | null;
}

/** Salons d'annonces suivis par un salon (Parametres du salon > Integrations > Salons suivis). */
export function useFollowedChannels(targetChannelId: string | null) {
  return useQuery({
    queryKey: ['followed-channels', targetChannelId],
    enabled: !!targetChannelId,
    queryFn: async (): Promise<FollowedSource[]> => {
      const { data, error } = await supabase.from('channel_followers').select('*').eq('target_channel_id', targetChannelId!);
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (f) => {
          const { data: info } = await supabase.rpc('get_followed_channel_info', { _channel_id: f.source_channel_id });
          return { ...(f as ChannelFollower), source: info?.[0] ?? null };
        }),
      );
    },
  });
}

/** Infos du salon d'annonces suivi (message systeme "X a ajoute ... dans ce salon"). */
export function useFollowedChannelInfo(sourceChannelId: string | null) {
  return useQuery({
    queryKey: ['followed-channel-info', sourceChannelId],
    enabled: !!sourceChannelId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_followed_channel_info', { _channel_id: sourceChannelId! });
      return data?.[0] ?? null;
    },
  });
}

export function useUpdateFollower() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { display_name?: string | null; target_channel_id?: string } }) => {
      const { error } = await supabase.from('channel_followers').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel-followers'] });
    },
    onError: () => toast.error("Impossible d'enregistrer les modifications"),
  });
}
