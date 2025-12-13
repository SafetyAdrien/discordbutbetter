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

export interface OrphanChannel extends ChannelWithCategory {}

export function useChannels(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channels', serverId],
    queryFn: async (): Promise<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }> => {
      if (!serverId) return { categories: [], orphanChannels: [] };

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
      const categorizedChannels = categories.map((cat) => ({
        ...cat,
        channels: channels
          .filter((ch) => ch.category_id === cat.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }));

      // Get orphan channels (no category)
      const orphanChannels = channels
        .filter((ch) => !ch.category_id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      return { categories: categorizedChannels, orphanChannels };
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
    onMutate: async ({ serverId, name }) => {
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      
      const previousData = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      
      if (previousData) {
        const tempCategory: CategoryWithChannels = {
          id: `temp-${Date.now()}`,
          name,
          position: previousData.categories.length,
          channels: []
        };
        
        queryClient.setQueryData(['channels', serverId], {
          ...previousData,
          categories: [...previousData.categories, tempCategory]
        });
      }
      
      return { previousData };
    },
    onError: (_, { serverId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['channels', serverId], context.previousData);
      }
      toast.error('Erreur lors de la création de la catégorie');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    },
    onSuccess: () => {
      toast.success('Catégorie créée');
    },
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
      categoryId: string | null;
      name: string;
      type: ChannelType;
    }) => {
      // Get max position in category (or server for orphan channels)
      let existing;
      if (categoryId) {
        const result = await supabase
          .from('channels')
          .select('position')
          .eq('category_id', categoryId)
          .order('position', { ascending: false })
          .limit(1);
        existing = result.data;
      } else {
        const result = await supabase
          .from('channels')
          .select('position')
          .eq('server_id', serverId)
          .is('category_id', null)
          .order('position', { ascending: false })
          .limit(1);
        existing = result.data;
      }

      const nextPosition = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from('channels')
        .insert({
          server_id: serverId,
          category_id: categoryId || null,
          name,
          type,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ serverId, categoryId, name, type }) => {
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      
      const previousData = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      
      if (previousData) {
        const tempChannel: ChannelWithCategory = {
          id: `temp-${Date.now()}`,
          name,
          type,
          description: null,
          position: 0,
          category_id: categoryId,
          server_id: serverId
        };
        
        if (categoryId) {
          queryClient.setQueryData(['channels', serverId], {
            ...previousData,
            categories: previousData.categories.map(cat =>
              cat.id === categoryId
                ? { ...cat, channels: [...cat.channels, tempChannel] }
                : cat
            )
          });
        } else {
          queryClient.setQueryData(['channels', serverId], {
            ...previousData,
            orphanChannels: [...previousData.orphanChannels, tempChannel]
          });
        }
      }
      
      return { previousData };
    },
    onError: (_, { serverId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['channels', serverId], context.previousData);
      }
      toast.error('Erreur lors de la création du salon');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    },
    onSuccess: () => {
      toast.success('Salon créé');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, serverId }: { categoryId: string; serverId: string }) => {
      // Make channels orphans (category_id = null) instead of deleting them
      await supabase
        .from('channels')
        .update({ category_id: null, position: 0 })
        .eq('category_id', categoryId);
      
      // Delete category
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      return { serverId, categoryId };
    },
    onMutate: async ({ categoryId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      if (previousChannels) {
        const deletedCategory = previousChannels.categories.find(c => c.id === categoryId);
        const orphanedChannels = deletedCategory?.channels || [];
        
        queryClient.setQueryData(['channels', serverId], {
          categories: previousChannels.categories.filter(c => c.id !== categoryId),
          orphanChannels: [...previousChannels.orphanChannels, ...orphanedChannels.map(ch => ({
            ...ch,
            category_id: null,
            position: 0
          }))]
        });
      }
      
      // Also update servers query for immediate UI feedback
      if (previousServers) {
        queryClient.setQueryData(['servers'], (old: any) => 
          old?.map((server: any) => 
            server.id === serverId 
              ? {
                  ...server,
                  categories: server.categories?.filter((cat: any) => cat.id !== categoryId) || []
                }
              : server
          )
        );
      }
      
      return { previousChannels, previousServers, serverId };
    },
    onError: (_, { serverId }, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
    onSuccess: () => {
      toast.success('Catégorie supprimée');
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, serverId }: { channelId: string; serverId: string }) => {
      const { error } = await supabase.from('channels').delete().eq('id', channelId);
      if (error) throw error;
      return { serverId, channelId };
    },
    onMutate: async ({ channelId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      if (previousChannels) {
        queryClient.setQueryData(['channels', serverId], {
          categories: previousChannels.categories.map(cat => ({
            ...cat,
            channels: cat.channels.filter(ch => ch.id !== channelId)
          })),
          orphanChannels: previousChannels.orphanChannels.filter(ch => ch.id !== channelId)
        });
      }
      
      // Also update servers query for immediate UI feedback
      if (previousServers) {
        queryClient.setQueryData(['servers'], (old: any) => 
          old?.map((server: any) => 
            server.id === serverId 
              ? {
                  ...server,
                  categories: server.categories?.map((cat: any) => ({
                    ...cat,
                    channels: cat.channels?.filter((ch: any) => ch.id !== channelId) || []
                  })) || []
                }
              : server
          )
        );
      }
      
      return { previousChannels, previousServers, serverId };
    },
    onError: (_, { serverId }, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
    onSuccess: () => {
      toast.success('Salon supprimé');
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, orderedIds }: { serverId: string; orderedIds: string[] }) => {
      // Update positions
      const updates = orderedIds.map((id, index) => 
        supabase.from('categories').update({ position: index }).eq('id', id)
      );
      await Promise.all(updates);
      return { serverId };
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    },
  });
}

export function useReorderChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      serverId, 
      categoryId, 
      orderedIds 
    }: { 
      serverId: string; 
      categoryId: string | null; 
      orderedIds: string[] 
    }) => {
      // Update positions and category
      const updates = orderedIds.map((id, index) => 
        supabase.from('channels').update({ position: index, category_id: categoryId }).eq('id', id)
      );
      await Promise.all(updates);
      return { serverId, categoryId, orderedIds };
    },
    onMutate: async ({ serverId, categoryId, orderedIds }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      
      if (previousData) {
        // Apply optimistic update
        const allChannels = [
          ...previousData.categories.flatMap(c => c.channels),
          ...previousData.orphanChannels
        ];
        
        const movedChannels = orderedIds
          .map(id => allChannels.find(ch => ch.id === id))
          .filter((ch): ch is ChannelWithCategory => !!ch)
          .map((ch, index) => ({ ...ch, category_id: categoryId, position: index }));
        
        const movedIds = new Set(orderedIds);
        
        const newCategories = previousData.categories.map(cat => ({
          ...cat,
          channels: cat.id === categoryId 
            ? movedChannels
            : cat.channels.filter(ch => !movedIds.has(ch.id))
        }));
        
        const newOrphans = categoryId === null 
          ? movedChannels
          : previousData.orphanChannels.filter(ch => !movedIds.has(ch.id));
        
        queryClient.setQueryData(['channels', serverId], {
          categories: newCategories,
          orphanChannels: newOrphans
        });
      }
      
      return { previousData };
    },
    onError: (_, { serverId }, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['channels', serverId], context.previousData);
      }
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}
