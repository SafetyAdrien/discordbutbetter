import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { uuidToSnowflake } from '@/lib/snowflake';

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
  has?: 'image' | 'video' | 'file' | 'link' | string;
}

export interface SearchMember {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

interface SearchResult {
  id: string;
  content: string;
  created_at: string | null;
  channel_id: string;
  author_id: string | null;
  attachments: any;
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

const hasAnyFilter = (f: SearchFilters) =>
  Boolean(
    f.from ||
      f.mentions ||
      f.contains ||
      f.channel ||
      f.during ||
      f.before ||
      f.after ||
      f.pinned !== undefined ||
      f.authorType ||
      f.has,
  );

function resolveMemberId(
  needle: string | undefined,
  members: SearchMember[] | undefined,
): string | undefined {
  if (!needle || !members || members.length === 0) return undefined;
  const lower = needle.toLowerCase().replace(/^@/, '');
  const exact = members.find(
    (m) =>
      m.username.toLowerCase() === lower ||
      m.displayName.toLowerCase() === lower,
  );
  if (exact) return exact.id;
  const partial = members.find(
    (m) =>
      m.username.toLowerCase().includes(lower) ||
      m.displayName.toLowerCase().includes(lower),
  );
  return partial?.id;
}

export function useGlobalSearch(
  serverId: string | null,
  query: string,
  filters: SearchFilters,
  members: SearchMember[] = [],
  enabled = true,
) {
  return useQuery({
    queryKey: ['globalSearch', serverId, query, filters],
    enabled: enabled && Boolean(serverId) && (query.trim().length > 0 || hasAnyFilter(filters)),
    placeholderData: keepPreviousData,
    staleTime: 0,
    queryFn: async (): Promise<SearchResult[]> => {
      if (!serverId) return [];

      const { data: serverChannels } = await supabase
        .from('channels')
        .select('id, name, type')
        .eq('server_id', serverId);

      if (!serverChannels || serverChannels.length === 0) return [];

      const channelIds = serverChannels.map((c) => c.id);

      let request = supabase
        .from('messages')
        .select(
          `
          id,
          content,
          created_at,
          channel_id,
          author_id,
          attachments,
          author:profiles!messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `,
        )
        .in('channel_id', channelIds)
        .order('created_at', { ascending: false })
        .limit(100);

      // Content
      if (filters.contains || query.trim()) {
        const searchText = (filters.contains || query).trim();
        if (searchText) request = request.ilike('content', `%${searchText}%`);
      }

      // Dates
      if (filters.before) request = request.lt('created_at', `${filters.before}T23:59:59`);
      if (filters.after) request = request.gt('created_at', `${filters.after}T00:00:00`);
      if (filters.during) {
        request = request
          .gte('created_at', `${filters.during}T00:00:00`)
          .lte('created_at', `${filters.during}T23:59:59`);
      }

      // Channel filter (in:)
      if (filters.channel) {
        const matchingChannel = serverChannels.find(
          (c) => c.name.toLowerCase() === filters.channel?.toLowerCase().replace(/^#/, ''),
        );
        if (matchingChannel) {
          request = request.eq('channel_id', matchingChannel.id);
        }
      }

      // From filter (resolve to author_id server-side)
      if (filters.from) {
        const resolvedId = resolveMemberId(filters.from, members);
        if (resolvedId) {
          request = request.eq('author_id', resolvedId);
        }
      }

      // Mentions filter (Snowflake)
      if (filters.mentions) {
        const resolvedId = resolveMemberId(filters.mentions, members);
        if (resolvedId) {
          const snowflake = uuidToSnowflake(resolvedId);
          request = request.ilike('content', `%<@${snowflake}%`);
        }
      }

      const { data, error } = await request;
      if (error) throw error;

      let results = (data || []) as SearchResult[];

      // Author type
      if (filters.authorType) {
        if (filters.authorType === 'bot') {
          results = results.filter((m) => m.author?.username.toLowerCase().includes('bot'));
        } else if (filters.authorType === 'webhook') {
          results = results.filter((m) => m.author_id === null);
        } else if (filters.authorType === 'user') {
          results = results.filter(
            (m) => m.author_id !== null && !m.author?.username.toLowerCase().includes('bot'),
          );
        }
      }

      // has: filter
      if (filters.has) {
        const kind = filters.has.toLowerCase();
        results = results.filter((m) => {
          const atts = Array.isArray(m.attachments) ? m.attachments : [];
          if (kind === 'image') {
            return atts.some((a: any) => {
              const t = (a?.type || a?.contentType || '').toLowerCase();
              const n = (a?.name || a?.url || '').toLowerCase();
              return t.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(n);
            });
          }
          if (kind === 'video') {
            return atts.some((a: any) => {
              const t = (a?.type || a?.contentType || '').toLowerCase();
              const n = (a?.name || a?.url || '').toLowerCase();
              return t.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(n);
            });
          }
          if (kind === 'file') {
            return atts.length > 0;
          }
          if (kind === 'link') {
            return /https?:\/\/\S+/i.test(m.content || '');
          }
          return true;
        });
      }

      const resultsWithChannel = results.map((r) => ({
        ...r,
        channel: serverChannels.find((c) => c.id === r.channel_id) || null,
      }));

      // Pinned
      if (filters.pinned !== undefined) {
        const { data: pinnedData } = await supabase
          .from('pinned_messages')
          .select('message_id')
          .in('channel_id', channelIds);

        const pinnedIds = new Set(pinnedData?.map((p) => p.message_id) || []);
        return filters.pinned
          ? resultsWithChannel.filter((r) => pinnedIds.has(r.id))
          : resultsWithChannel.filter((r) => !pinnedIds.has(r.id));
      }

      return resultsWithChannel;
    },
  });
}
