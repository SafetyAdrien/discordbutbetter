import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  server_id: string;
}

export interface Announcement {
  id: string;
  channel_id: string;
  title: string;
  content: string;
  banner_url?: string;
  pinned: boolean;
  featured: boolean;
  view_count: number;
  created_at: string;
  edited_at?: string;
  category?: AnnouncementCategory;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface RepliedCommentSnapshot {
  id: string;
  content: string;
  deleted?: boolean;
  author: { id: string; display_name: string; avatar_url: string | null } | null;
}

export interface AnnouncementComment {
  id: string;
  announcement_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  repliedComment?: RepliedCommentSnapshot | null;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface AnnouncementReaction {
  id: string;
  announcement_id: string;
  user_id: string;
  emoji: string;
}

// Fetch announcements for a channel
export function useAnnouncements(channelId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Realtime subscription for announcements
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`announcements-rt-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements', filter: `channel_id=eq.${channelId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['announcements', channelId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return useQuery({
    queryKey: ['announcements', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          category:announcement_categories(*),
          author:profiles!author_id(id, display_name, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Announcement[];
    },
    enabled: !!channelId,
  });
}

// Create announcement
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      channelId: string;
      title: string;
      content: string;
      categoryId?: string;
      bannerUrl?: string;
      pinned?: boolean;
      featured?: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from('announcements')
        .insert({
          channel_id: data.channelId,
          author_id: user?.id,
          title: data.title,
          content: data.content,
          category_id: data.categoryId || null,
          banner_url: data.bannerUrl || null,
          pinned: data.pinned || false,
          featured: data.featured || false,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onMutate: async (data) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['announcements', data.channelId] });
      const previousAnnouncements = queryClient.getQueryData(['announcements', data.channelId]);
      
      const tempAnnouncement: Announcement = {
        id: `temp-${Date.now()}`,
        channel_id: data.channelId,
        title: data.title,
        content: data.content,
        banner_url: data.bannerUrl,
        pinned: data.pinned || false,
        featured: data.featured || false,
        view_count: 0,
        created_at: new Date().toISOString(),
        author: {
          id: user.id,
          display_name: user.user_metadata?.display_name || 'Vous',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };
      
      queryClient.setQueryData(['announcements', data.channelId], (old: Announcement[] | undefined) => 
        old ? [tempAnnouncement, ...old] : [tempAnnouncement]
      );
      
      return { previousAnnouncements };
    },
    onError: (_, variables, context) => {
      if (context?.previousAnnouncements) {
        queryClient.setQueryData(['announcements', variables.channelId], context.previousAnnouncements);
      }
      toast.error('Erreur lors de la création');
    },
    onSuccess: (_, variables) => {
      toast.success('Annonce publiée');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.channelId] });
    },
  });
}

// Update announcement
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      channelId: string;
      title?: string;
      content?: string;
      categoryId?: string;
      bannerUrl?: string;
      pinned?: boolean;
      featured?: boolean;
    }) => {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: data.title,
          content: data.content,
          category_id: data.categoryId,
          banner_url: data.bannerUrl,
          pinned: data.pinned,
          featured: data.featured,
          edited_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['announcements', data.channelId] });
      const previousAnnouncements = queryClient.getQueryData(['announcements', data.channelId]);
      
      queryClient.setQueryData(['announcements', data.channelId], (old: Announcement[] | undefined) =>
        old?.map(a => a.id === data.id ? {
          ...a,
          title: data.title ?? a.title,
          content: data.content ?? a.content,
          banner_url: data.bannerUrl ?? a.banner_url,
          pinned: data.pinned ?? a.pinned,
          featured: data.featured ?? a.featured,
          edited_at: new Date().toISOString(),
        } : a)
      );
      
      return { previousAnnouncements };
    },
    onError: (_, variables, context) => {
      if (context?.previousAnnouncements) {
        queryClient.setQueryData(['announcements', variables.channelId], context.previousAnnouncements);
      }
      toast.error('Erreur lors de la modification');
    },
    onSuccess: () => {
      toast.success('Annonce modifiée');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.channelId] });
    },
  });
}

// Delete announcement
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; channelId: string }) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['announcements', data.channelId] });
      const previousAnnouncements = queryClient.getQueryData(['announcements', data.channelId]);
      
      queryClient.setQueryData(['announcements', data.channelId], (old: Announcement[] | undefined) =>
        old?.filter(a => a.id !== data.id)
      );
      
      return { previousAnnouncements };
    },
    onError: (_, variables, context) => {
      if (context?.previousAnnouncements) {
        queryClient.setQueryData(['announcements', variables.channelId], context.previousAnnouncements);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Annonce supprimée');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.channelId] });
    },
  });
}

// Increment view count
export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { data: current } = await supabase
        .from('announcements')
        .select('view_count')
        .eq('id', announcementId)
        .single();

      if (current) {
        await supabase
          .from('announcements')
          .update({ view_count: (current.view_count || 0) + 1 })
          .eq('id', announcementId);
      }
    },
  });
}

// Upload banner
export function useUploadAnnouncementBanner() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('announcement-banners')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('announcement-banners')
        .getPublicUrl(fileName);

      return data.publicUrl;
    },
    onError: () => {
      toast.error("Erreur lors de l'upload de l'image");
    },
  });
}

// Categories with realtime
export function useAnnouncementCategories(serverId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`ann-categories-rt-${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_categories', filter: `server_id=eq.${serverId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['announcement-categories', serverId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  return useQuery({
    queryKey: ['announcement-categories', serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_categories')
        .select('*')
        .eq('server_id', serverId)
        .order('name');

      if (error) throw error;
      return data as AnnouncementCategory[];
    },
    enabled: !!serverId,
  });
}

export function useCreateAnnouncementCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { serverId: string; name: string; color: string; icon?: string }) => {
      const { data: result, error } = await supabase
        .from('announcement_categories')
        .insert({
          server_id: data.serverId,
          name: data.name,
          color: data.color,
          icon: data.icon || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['announcement-categories', data.serverId] });
      const previousCategories = queryClient.getQueryData(['announcement-categories', data.serverId]);
      
      const tempCategory: AnnouncementCategory = {
        id: `temp-${Date.now()}`,
        server_id: data.serverId,
        name: data.name,
        color: data.color,
        icon: data.icon,
      };
      
      queryClient.setQueryData(['announcement-categories', data.serverId], (old: AnnouncementCategory[] | undefined) =>
        old ? [...old, tempCategory] : [tempCategory]
      );
      
      return { previousCategories };
    },
    onError: (_, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['announcement-categories', variables.serverId], context.previousCategories);
      }
      toast.error('Erreur lors de la création');
    },
    onSuccess: () => {
      toast.success('Catégorie créée');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-categories', variables.serverId] });
    },
  });
}

export function useDeleteAnnouncementCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; serverId: string }) => {
      const { error } = await supabase
        .from('announcement_categories')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['announcement-categories', data.serverId] });
      const previousCategories = queryClient.getQueryData(['announcement-categories', data.serverId]);
      
      queryClient.setQueryData(['announcement-categories', data.serverId], (old: AnnouncementCategory[] | undefined) =>
        old?.filter(c => c.id !== data.id)
      );
      
      return { previousCategories };
    },
    onError: (_, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['announcement-categories', variables.serverId], context.previousCategories);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Catégorie supprimée');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-categories', variables.serverId] });
    },
  });
}

// Comments with realtime
export function useAnnouncementComments(announcementId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!announcementId) return;

    const channel = supabase
      .channel(`ann-comments-rt-${announcementId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_comments', filter: `announcement_id=eq.${announcementId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['announcement-comments', announcementId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [announcementId, queryClient]);

  return useQuery({
    queryKey: ['announcement-comments', announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_comments')
        .select(`
          *,
          author:profiles!author_id(id, display_name, avatar_url)
        `)
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as AnnouncementComment[];
    },
    enabled: !!announcementId,
  });
}

export function useAddAnnouncementComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { announcementId: string; content: string }) => {
      const { data: result, error } = await supabase
        .from('announcement_comments')
        .insert({
          announcement_id: data.announcementId,
          author_id: user?.id,
          content: data.content,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onMutate: async (data) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['announcement-comments', data.announcementId] });
      const previousComments = queryClient.getQueryData(['announcement-comments', data.announcementId]);
      
      const tempComment: AnnouncementComment = {
        id: `temp-${Date.now()}`,
        announcement_id: data.announcementId,
        content: data.content,
        created_at: new Date().toISOString(),
        author: {
          id: user.id,
          display_name: user.user_metadata?.display_name || 'Vous',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };
      
      queryClient.setQueryData(['announcement-comments', data.announcementId], (old: AnnouncementComment[] | undefined) =>
        old ? [...old, tempComment] : [tempComment]
      );
      
      return { previousComments };
    },
    onError: (_, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['announcement-comments', variables.announcementId], context.previousComments);
      }
      toast.error("Erreur lors de l'ajout du commentaire");
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-comments', variables.announcementId] });
    },
  });
}

export function useDeleteAnnouncementComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; announcementId: string }) => {
      const { error } = await supabase
        .from('announcement_comments')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['announcement-comments', data.announcementId] });
      const previousComments = queryClient.getQueryData(['announcement-comments', data.announcementId]);
      
      queryClient.setQueryData(['announcement-comments', data.announcementId], (old: AnnouncementComment[] | undefined) =>
        old?.filter(c => c.id !== data.id)
      );
      
      return { previousComments };
    },
    onError: (_, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['announcement-comments', variables.announcementId], context.previousComments);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-comments', variables.announcementId] });
    },
  });
}

// Reactions with realtime
export function useAnnouncementReactions(announcementId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!announcementId) return;

    const channel = supabase
      .channel(`ann-reactions-rt-${announcementId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_reactions', filter: `announcement_id=eq.${announcementId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['announcement-reactions', announcementId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [announcementId, queryClient]);

  return useQuery({
    queryKey: ['announcement-reactions', announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_reactions')
        .select('*')
        .eq('announcement_id', announcementId);

      if (error) throw error;
      return data as AnnouncementReaction[];
    },
    enabled: !!announcementId,
  });
}

export function useToggleAnnouncementReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { announcementId: string; emoji: string }) => {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('announcement_reactions')
        .select('id')
        .eq('announcement_id', data.announcementId)
        .eq('user_id', user?.id)
        .eq('emoji', data.emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from('announcement_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add reaction
        const { error } = await supabase
          .from('announcement_reactions')
          .insert({
            announcement_id: data.announcementId,
            user_id: user?.id,
            emoji: data.emoji,
          });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onMutate: async (data) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['announcement-reactions', data.announcementId] });
      const previousReactions = queryClient.getQueryData(['announcement-reactions', data.announcementId]);
      
      queryClient.setQueryData(['announcement-reactions', data.announcementId], (old: AnnouncementReaction[] | undefined) => {
        if (!old) return old;
        const existing = old.find(r => r.user_id === user.id && r.emoji === data.emoji);
        if (existing) {
          return old.filter(r => r.id !== existing.id);
        } else {
          return [...old, {
            id: `temp-${Date.now()}`,
            announcement_id: data.announcementId,
            user_id: user.id,
            emoji: data.emoji,
          }];
        }
      });
      
      return { previousReactions };
    },
    onError: (_, variables, context) => {
      if (context?.previousReactions) {
        queryClient.setQueryData(['announcement-reactions', variables.announcementId], context.previousReactions);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-reactions', variables.announcementId] });
    },
  });
}
