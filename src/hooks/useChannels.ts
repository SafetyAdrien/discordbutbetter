import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ChannelType = 'text' | 'voice' | 'announcement' | 'forum' | 'media' | 'calendar' | 'tasks';

export interface ChannelWithCategory {
  id: string;
  name: string;
  type: ChannelType | null;
  description: string | null;
  position: number | null;
  category_id: string | null;
  server_id: string;
}

export interface CategoryWithChannels {
  id: string;
  name: string;
  position: number | null;
  channels: ChannelWithCategory[];
}

export function useChannels(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channels', serverId],
    queryFn: async (): Promise<CategoryWithChannels[]> => {
      if (!serverId) return [];

      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, position')
        .eq('server_id', serverId)
        .order('position', { ascending: true });

      if (catError) throw catError;

      // Fetch channels
      const { data: channels, error: chanError } = await supabase
        .from('channels')
        .select('id, name, type, description, position, category_id, server_id')
        .eq('server_id', serverId)
        .order('position', { ascending: true });

      if (chanError) throw chanError;

      // Group channels by category
      return categories.map((cat) => ({
        ...cat,
        channels: channels
          .filter((ch) => ch.category_id === cat.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }));
    },
    enabled: !!serverId && !!user,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, name }: { serverId: string; name: string }) => {
      // Get max position
      const { data: existing } = await supabase
        .from('categories')
        .select('position')
        .eq('server_id', serverId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from('categories')
        .insert({ server_id: serverId, name, position: nextPosition })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      toast.success('Catégorie créée');
    },
    onError: () => toast.error('Erreur lors de la création de la catégorie'),
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      categoryId,
      name,
      type,
    }: {
      serverId: string;
      categoryId: string;
      name: string;
      type: ChannelType;
    }) => {
      // Get max position in category
      const { data: existing } = await supabase
        .from('channels')
        .select('position')
        .eq('category_id', categoryId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from('channels')
        .insert({
          server_id: serverId,
          category_id: categoryId,
          name,
          type,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      toast.success('Salon créé');
    },
    onError: () => toast.error('Erreur lors de la création du salon'),
  });
}
