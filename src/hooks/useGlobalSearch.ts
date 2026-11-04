import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { uuidToSnowflake } from '@/lib/snowflake';

/** Max results returned to the user once all filters have been applied. */
const RESULT_LIMIT = 50;

/**
 * Escape LIKE wildcards in user input.
 *
 * `%` and `_` typed by the user were previously passed straight into the
 * `ilike` pattern, turning a literal search into a wildcard match that scans
 * far more rows than intended.
 */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export type SearchHasType = 'image' | 'video' | 'link' | 'file' | 'embed' | 'sound' | 'poll' | 'sticker' | 'forward';

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
  /** Selections multiples de la fenetre Filtres (ids exacts). */
  fromIds?: string[];
  channelIds?: string[];
  mentionIds?: string[];
  authorTypes?: string[];
  /** "contient:" : types de contenu. */
  has?: SearchHasType[];
  /** Ordre des resultats ("Trier"). */
  sort?: 'newest' | 'oldest';
}

export interface SearchResult {
  id: string;
  /** 'poll' : resultat issu de la table polls ("contient: sondage"). */
  kind?: 'message' | 'poll';
  content: string;
  attachments?: unknown;
  original_message_id?: string | null;
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

const URL_RE = /https?:\/\/\S+/i;
const AUDIO_RE = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;

function attachmentsOf(m: SearchResult): { type?: string; name?: string }[] {
  return Array.isArray(m.attachments) ? (m.attachments as { type?: string; name?: string }[]) : [];
}

function messageHas(m: SearchResult, h: SearchHasType): boolean {
  const atts = attachmentsOf(m);
  switch (h) {
    case 'image': return atts.some((a) => a.type === 'image' || a.type === 'gif');
    case 'video': return atts.some((a) => a.type === 'video');
    case 'sticker': return atts.some((a) => a.type === 'sticker');
    case 'sound': return atts.some((a) => a.type === 'file' && AUDIO_RE.test(a.name ?? ''));
    case 'file': return atts.some((a) => a.type === 'file');
    case 'link':
    case 'embed': return URL_RE.test(m.content);
    case 'forward': return !!m.original_message_id;
    default: return false;
  }
}

function authorMatches(m: SearchResult, t: string): boolean {
  const isBot = !!m.author?.username.toLowerCase().includes('bot');
  if (t === 'webhook') return m.author_id === null;
  if (t === 'bot') return isBot;
  return m.author_id !== null && !isBot;
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
          attachments,
          original_message_id,
          author:profiles!messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('channel_id', filters.channelIds?.length ? channelIds.filter((id) => filters.channelIds!.includes(id)) : channelIds)
        .order('created_at', { ascending: filters.sort === 'oldest' });

      if (filters.fromIds?.length) {
        request = request.in('author_id', filters.fromIds);
      }

      // Apply content filter
      if (filters.contains || query) {
        const searchText = filters.contains || query;
        request = request.ilike('content', `%${escapeLike(searchText)}%`);
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

      // Mentions par identifiant : le contenu stocke <@uuid> ou <@snowflake>.
      if (filters.mentionIds?.length) {
        const tokens = filters.mentionIds.flatMap((id) => {
          const snow = uuidToSnowflake(id);
          return [`<@${id}>`, `<@!${id}>`, `<@${snow}>`, `<@!${snow}>`];
        });
        results = results.filter((m) => tokens.some((t) => m.content.includes(t)));
      }

      // "contient:" : chaque type selectionne doit etre present.
      if (filters.has?.length) {
        const hasTypes = filters.has.filter((h) => h !== 'poll');
        results = results.filter((m) => hasTypes.every((h) => messageHas(m, h)));
      }

      // Plusieurs types d'auteur : le message doit correspondre a l'un d'eux.
      if (filters.authorTypes?.length) {
        results = results.filter((m) => filters.authorTypes!.some((t) => authorMatches(m, t)));
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
      let resultsWithChannel: (SearchResult & { channel: { id: string; name: string; type: string | null } | null })[] = results.map(r => ({
        ...r,
        kind: 'message' as const,
        channel: serverChannels.find(c => c.id === r.channel_id) || null,
      }));

      // "contient: sondage" : les sondages vivent dans leur propre table.
      if (filters.has?.includes('poll')) {
        const pollChannels = filters.channelIds?.length ? channelIds.filter((id) => filters.channelIds!.includes(id)) : channelIds;
        let pollReq = supabase
          .from('polls')
          .select('id, question, created_at, channel_id, author_id, author:profiles!polls_author_id_fkey (id, username, display_name, avatar_url)')
          .in('channel_id', pollChannels)
          .order('created_at', { ascending: filters.sort === 'oldest' });
        if (filters.fromIds?.length) pollReq = pollReq.in('author_id', filters.fromIds);
        const text = filters.contains || query;
        if (text) pollReq = pollReq.ilike('question', `%${escapeLike(text)}%`);
        const { data: polls } = await pollReq;
        const pollResults = (polls || []).map((p) => ({
          id: p.id,
          kind: 'poll' as const,
          content: `📊 ${p.question}`,
          created_at: p.created_at,
          channel_id: p.channel_id,
          author_id: p.author_id,
          author: (p.author as SearchResult['author']) ?? null,
          channel: serverChannels.find((c) => c.id === p.channel_id) || null,
        }));
        const otherTypes = filters.has.filter((h) => h !== 'poll');
        resultsWithChannel = otherTypes.length ? [...resultsWithChannel, ...pollResults] : pollResults;
        resultsWithChannel.sort((a, b) =>
          filters.sort === 'oldest'
            ? (a.created_at ?? '').localeCompare(b.created_at ?? '')
            : (b.created_at ?? '').localeCompare(a.created_at ?? ''),
        );
      }

      // Handle pinned filter - requires additional query
      if (filters.pinned !== undefined) {
        const { data: pinnedData } = await supabase
          .from('pinned_messages')
          .select('message_id')
          .in('channel_id', channelIds);

        const pinnedIds = new Set(pinnedData?.map(p => p.message_id) || []);
        const filtered = filters.pinned
          ? resultsWithChannel.filter(r => pinnedIds.has(r.id))
          : resultsWithChannel.filter(r => !pinnedIds.has(r.id));

        return filtered.slice(0, RESULT_LIMIT);
      }

      // Cap AFTER the client-side filters. Limiting in the query first
      // returned up to 50 rows and then narrowed them down, so a search could
      // report fewer (or zero) matches while more existed.
      return resultsWithChannel.slice(0, RESULT_LIMIT);
    },
  });
}
