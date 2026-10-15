import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ForumTag {
  id: string;
  channel_id: string;
  name: string;
  moderated: boolean;
  emoji_id: string | null;
  emoji_name: string | null;
  position: number;
}

export interface ForumChannelConfig {
  channel_id: string;
  default_sort_order: number;
  default_layout: number;
  default_tag_setting: string;
  require_tag: boolean;
  /** Fluxer ChannelFlags.HIDE_MEDIA_DOWNLOAD_OPTIONS — media channels only. */
  hide_media_download_options: boolean;
  default_auto_archive_duration: number;
  default_reaction_emoji_id: string | null;
  default_reaction_emoji_name: string | null;
}

/** Mirrors Fluxer's ForumSortOrderTypes. */
export const FORUM_SORT_ORDERS = {
  LATEST_ACTIVITY: 0,
  CREATION_TIME: 1,
} as const;

/** Mirrors Fluxer's ForumLayoutTypes. */
export const FORUM_LAYOUTS = {
  DEFAULT: 0,
  LIST: 1,
  GRID: 2,
} as const;

/** Mirrors Fluxer's MAX_FORUM_TAGS_PER_CHANNEL. */
export const MAX_FORUM_TAGS_PER_CHANNEL = 20;
/** Mirrors Fluxer's MAX_APPLIED_TAGS_PER_THREAD. */
export const MAX_APPLIED_TAGS_PER_POST = 5;
/** Mirrors Fluxer's FORUM_TAG_NAME_MAX_LENGTH. */
export const FORUM_TAG_NAME_MAX_LENGTH = 50;

export const DEFAULT_FORUM_CONFIG: Omit<ForumChannelConfig, 'channel_id'> = {
  default_sort_order: FORUM_SORT_ORDERS.LATEST_ACTIVITY,
  default_layout: FORUM_LAYOUTS.DEFAULT,
  default_tag_setting: 'match_some',
  require_tag: false,
  hide_media_download_options: false,
  default_auto_archive_duration: 4320,
  default_reaction_emoji_id: null,
  default_reaction_emoji_name: null,
};

/**
 * Tags defined on a forum channel.
 *
 * Fluxer stores these as real entities with an emoji and a `moderated` flag so
 * moderators define the vocabulary up front. The previous implementation derived
 * the tag list from the tags already present on posts, which meant a tag could
 * not exist until someone had used it.
 */
export function useForumTags(channelId: string) {
  const queryClient = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const query = useQuery<ForumTag[]>({
    queryKey: ['forum-tags', channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_tags')
        .select('*')
        .eq('channel_id', channelId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ForumTag[];
    },
  });

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`forum-tags:${channelId}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_tags', filter: `channel_id=eq.${channelId}` },
        () => queryClient.invalidateQueries({ queryKey: ['forum-tags', channelId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, queryClient]);

  return query;
}

/** Channel-level forum configuration (sort order, layout, tag rules). */
export function useForumChannelConfig(channelId: string) {
  return useQuery<ForumChannelConfig>({
    queryKey: ['forum-config', channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_channel_config')
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();
      if (error) throw error;
      // No row yet => fall back to Fluxer's defaults.
      return (data ?? { channel_id: channelId, ...DEFAULT_FORUM_CONFIG }) as ForumChannelConfig;
    },
  });
}

export function useCreateForumTag(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; emoji_name?: string | null; moderated?: boolean }) => {
      const name = input.name.trim();
      if (!name) throw new Error('Le nom du tag est requis');
      if (name.length > FORUM_TAG_NAME_MAX_LENGTH) {
        throw new Error(`Le nom ne doit pas dépasser ${FORUM_TAG_NAME_MAX_LENGTH} caractères`);
      }
      const { data: existing } = await supabase
        .from('forum_tags')
        .select('position')
        .eq('channel_id', channelId)
        .order('position', { ascending: false })
        .limit(1);
      const position = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from('forum_tags')
        .insert({
          channel_id: channelId,
          name,
          emoji_name: input.emoji_name ?? null,
          moderated: input.moderated ?? false,
          position,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ForumTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-tags', channelId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateForumTag(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; emoji_name?: string | null; moderated?: boolean }) => {
      if (patch.name !== undefined) {
        const name = patch.name.trim();
        if (!name) throw new Error('Le nom du tag est requis');
        if (name.length > FORUM_TAG_NAME_MAX_LENGTH) {
          throw new Error(`Le nom ne doit pas dépasser ${FORUM_TAG_NAME_MAX_LENGTH} caractères`);
        }
        patch.name = name;
      }
      const { data, error } = await supabase
        .from('forum_tags')
        .update(patch)
        .eq('id', id)
        .eq('channel_id', channelId)
        .select()
        .single();
      if (error) throw error;
      return data as ForumTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-tags', channelId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteForumTag(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('forum_tags')
        .delete()
        .eq('id', tagId)
        .eq('channel_id', channelId);
      if (error) throw error;
    },
    // Also strip the tag id from posts that referenced it, so a post can never
    // point at a tag that no longer exists.
    onSuccess: async (_data, tagId) => {
      const posts = await queryClient.fetchQuery({
        queryKey: ['forum-posts', channelId],
        staleTime: 0,
      }).catch(() => null) as Array<{ id: string; applied_tags?: string[] }> | null;

      if (posts) {
        const affected = posts.filter((p) => p.applied_tags?.includes(tagId));
        await Promise.all(
          affected.map((p) =>
            supabase
              .from('forum_posts')
              .update({ applied_tags: (p.applied_tags ?? []).filter((t) => t !== tagId) })
              .eq('id', p.id),
          ),
        );
      }
      queryClient.invalidateQueries({ queryKey: ['forum-tags', channelId] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/**
 * Persist channel-level forum settings.
 *
 * Upserts, because a channel may never have been configured: the read hook
 * falls back to Fluxer's defaults when no row exists.
 */
export function useUpdateForumChannelConfig(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<ForumChannelConfig, 'channel_id'>>) => {
      const { data: existing } = await supabase
        .from('forum_channel_config')
        .select('channel_id')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('forum_channel_config')
          .update(patch)
          .eq('channel_id', channelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('forum_channel_config')
          .insert({ channel_id: channelId, ...DEFAULT_FORUM_CONFIG, ...patch });
        if (error) throw error;
      }
      return patch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-config', channelId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}