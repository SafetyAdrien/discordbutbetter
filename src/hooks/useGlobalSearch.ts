import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchFilters {
  from?: string;
  mentions?: string;
  contains?: string;
  channel?: string;
  during?: string;
  before?: string;
  after?: string;
  pinned?: boolean;
  authorType?: string;
}

interface SearchResult {
  id: string;
  content: string;
  created_at: string | null;
  channel_id: string;
  author_id: string | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  channel: {
    id: string;
    name: string;
    type: string | null;
  } | null;
}

export function useGlobalSearch(serverId: string | null) {
  return useMutation({
    mutationFn: async ({ 
      query, 
      filters 
    }: { 
      query: string; 
      filters: SearchFilters 
    }): Promise<SearchResult[]> => {
      if (!serverId) return [];

      // Get all channels for this server first
      const { data: serverChannels } = await supabase
        .from('channels')
        .select('id, name, type')
        .eq('server_id', serverId);

      if (!serverChannels || serverChannels.length === 0) return [];

      const channelIds = serverChannels.map(c => c.id);

      // Build the base query
      let request = supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          author_id,
          author:profiles!messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('channel_id', channelIds)
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply content filter
      if (filters.contains || query) {
        const searchText = filters.contains || query;
        request = request.ilike('content', `%${searchText}%`);
      }

      // Apply date filters
      if (filters.before) {
        request = request.lt('created_at', `${filters.before}T23:59:59`);
      }

      if (filters.after) {
        request = request.gt('created_at', `${filters.after}T00:00:00`);
      }

      if (filters.during) {
        request = request
          .gte('created_at', `${filters.during}T00:00:00`)
          .lte('created_at', `${filters.during}T23:59:59`);
      }

      // Apply channel filter
      if (filters.channel) {
        const matchingChannel = serverChannels.find(c => 
          c.name.toLowerCase() === filters.channel?.toLowerCase()
        );
        if (matchingChannel) {
          request = request.eq('channel_id', matchingChannel.id);
        }
      }

      const { data, error } = await request;

      if (error) throw error;

      // Post-process results for additional filters
      let results = (data || []) as SearchResult[];

      // Filter by author name
      if (filters.from) {
        const fromLower = filters.from.toLowerCase();
        results = results.filter(m => 
          m.author?.username.toLowerCase().includes(fromLower) ||
          m.author?.display_name.toLowerCase().includes(fromLower)
        );
      }

      // Filter by mentions
      if (filters.mentions) {
        const mentionPattern = `@${filters.mentions}`.toLowerCase();
        results = results.filter(m => 
          m.content.toLowerCase().includes(mentionPattern)
        );
      }

      // Filter by author type
      if (filters.authorType) {
        if (filters.authorType === 'bot') {
          results = results.filter(m => 
            m.author?.username.toLowerCase().includes('bot')
          );
        } else if (filters.authorType === 'webhook') {
          results = results.filter(m => m.author_id === null);
        } else if (filters.authorType === 'user') {
          results = results.filter(m => 
            m.author_id !== null && 
            !m.author?.username.toLowerCase().includes('bot')
          );
        }
      }

      // Add channel info to results
      const resultsWithChannel = results.map(r => ({
        ...r,
        channel: serverChannels.find(c => c.id === r.channel_id) || null,
      }));

      // Handle pinned filter - requires additional query
      if (filters.pinned !== undefined) {
        if (filters.pinned) {
          // Get pinned message IDs
          const { data: pinnedData } = await supabase
            .from('pinned_messages')
            .select('message_id')
            .in('channel_id', channelIds);
          
          const pinnedIds = new Set(pinnedData?.map(p => p.message_id) || []);
          return resultsWithChannel.filter(r => pinnedIds.has(r.id));
        } else {
          const { data: pinnedData } = await supabase
            .from('pinned_messages')
            .select('message_id')
            .in('channel_id', channelIds);
          
          const pinnedIds = new Set(pinnedData?.map(p => p.message_id) || []);
          return resultsWithChannel.filter(r => !pinnedIds.has(r.id));
        }
      }

      return resultsWithChannel;
    },
  });
}
