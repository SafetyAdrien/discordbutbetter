import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface AnnouncementComment {
  id: string;
  announcement_id: string;
  content: string;
  created_at: string;
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.channelId] });
      toast.success('Annonce publiée');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.channelId] });
      toast.success('Annonce modifiée');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.channelId] });
      toast.success('Annonce supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

// Increment view count
export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (announcementId: string) => {
      // Simple increment using update
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

// Categories
export function useAnnouncementCategories(serverId: string) {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-categories', variables.serverId] });
      toast.success('Catégorie créée');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-categories', variables.serverId] });
      toast.success('Catégorie supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

// Comments
export function useAnnouncementComments(announcementId: string) {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-comments', variables.announcementId] });
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du commentaire");
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-comments', variables.announcementId] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

// Reactions
export function useAnnouncementReactions(announcementId: string) {
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
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcement-reactions', variables.announcementId] });
    },
  });
}
