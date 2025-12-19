import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChannelFollower {
  id: string;
  source_channel_id: string;
  target_channel_id: string;
  follower_user_id: string;
  created_at: string;
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

        // Check if user is owner or has administrator permission
        const isOwner = server.owner_id === user.id;
        
        if (!isOwner) {
          // Check for admin permission
          const { data: hasAdmin } = await supabase
            .rpc('has_server_permission', {
              _user_id: user.id,
              _server_id: server.id,
              _permission: 'administrator'
            });
          
          if (!hasAdmin) continue;
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
      toast.success('Suivi supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression du suivi');
      console.error('Unfollow channel error:', error);
    },
  });
}

// Publish a message to all followers
export function usePublishMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
      content,
      sourceServerId,
      sourceServerName,
      sourceServerIcon,
      sourceChannelName,
    }: {
      messageId: string;
      channelId: string;
      content: string;
      sourceServerId: string;
      sourceServerName: string;
      sourceServerIcon: string | null;
      sourceChannelName: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get all followers of this channel
      const { data: followers, error: followersError } = await supabase
        .from('channel_followers')
        .select('target_channel_id')
        .eq('source_channel_id', channelId);

      if (followersError) throw followersError;

      if (!followers || followers.length === 0) {
        throw new Error('Aucun salon ne suit ce salon');
      }

      // Create a message in each target channel
      const messages = followers.map((follower) => ({
        channel_id: follower.target_channel_id,
        content: content,
        author_id: user.id,
        source_server_id: sourceServerId,
        source_server_name: sourceServerName,
        source_server_icon: sourceServerIcon,
        source_channel_name: sourceChannelName,
        is_published_message: true,
        original_message_id: messageId,
      }));

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messages);

      if (insertError) throw insertError;

      // Mark original message as published (dismiss prompt)
      await supabase
        .from('messages')
        .update({ publish_dismissed: true })
        .eq('id', messageId);

      return { count: followers.length };
    },
    onSuccess: ({ count }, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      toast.success(`Message publié vers ${count} salon${count > 1 ? 's' : ''}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la publication');
      console.error('Publish message error:', error);
    },
  });
}

// Dismiss publish prompt for a message
export function useDismissPublishPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
    }: {
      messageId: string;
      channelId: string;
    }) => {
      const { error } = await supabase
        .from('messages')
        .update({ publish_dismissed: true })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

// Send a system message when a channel is followed
export function useSendFollowSystemMessage() {
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      targetChannelId,
      sourceServerName,
      sourceChannelName,
    }: {
      targetChannelId: string;
      sourceServerName: string;
      sourceChannelName: string;
    }) => {
      if (!user || !profile) throw new Error('Not authenticated');

      const content = `→ **${profile.display_name}** a ajouté **${sourceServerName} #${sourceChannelName}** dans ce salon. Les mises à jour les plus importantes s'afficheront ici.`;

      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: targetChannelId,
          content: content,
          author_id: null, // System message
        });

      if (error) throw error;
    },
  });
}
