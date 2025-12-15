import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ChannelType = 'text' | 'voice' | 'announcement' | 'forum' | 'media' | 'calendar' | 'tasks' | 'stage';

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

// Shared ref to prevent Realtime conflicts during mutations
const mutationLockRef = { current: false };

export function useChannels(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Realtime subscription for channels and categories
  useEffect(() => {
    if (!serverId || !user) return;

    const channel = supabase
      .channel(`channels-realtime-${serverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `server_id=eq.${serverId}`
        },
        () => {
          // Skip invalidation if a local mutation is in progress
          if (mutationLockRef.current) return;
          
          // Debounce to avoid flickering
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
            queryClient.invalidateQueries({ queryKey: ['servers'] });
          }, 300);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `server_id=eq.${serverId}`
        },
        () => {
          // Skip invalidation if a local mutation is in progress
          if (mutationLockRef.current) return;
          
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
            queryClient.invalidateQueries({ queryKey: ['servers'] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [serverId, user, queryClient]);

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
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      const tempCategory: CategoryWithChannels = {
        id: `temp-${Date.now()}`,
        name,
        position: previousChannels?.categories.length ?? 0,
        channels: []
      };
      
      if (previousChannels) {
        queryClient.setQueryData(['channels', serverId], {
          ...previousChannels,
          categories: [...previousChannels.categories, tempCategory]
        });
      }
      
      // Also update servers cache
      if (previousServers) {
        queryClient.setQueryData(['servers'], (old: any) =>
          old?.map((server: any) =>
            server.id === serverId
              ? { ...server, categories: [...(server.categories || []), { id: tempCategory.id, name, channels: [] }] }
              : server
          )
        );
      }
      
      return { previousChannels, previousServers, serverId };
    },
    onError: (_, __, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', context.serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la création de la catégorie');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
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
          type: type as any, // 'stage' type added via migration, cast to bypass generated types
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ serverId, categoryId, name, type }) => {
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      const tempChannel: ChannelWithCategory = {
        id: `temp-${Date.now()}`,
        name,
        type,
        description: null,
        position: 0,
        category_id: categoryId,
        server_id: serverId
      };
      
      if (previousChannels) {
        if (categoryId) {
          queryClient.setQueryData(['channels', serverId], {
            ...previousChannels,
            categories: previousChannels.categories.map(cat =>
              cat.id === categoryId
                ? { ...cat, channels: [...cat.channels, tempChannel] }
                : cat
            )
          });
        } else {
          queryClient.setQueryData(['channels', serverId], {
            ...previousChannels,
            orphanChannels: [...previousChannels.orphanChannels, tempChannel]
          });
        }
      }
      
      // Also update servers cache
      if (previousServers) {
        queryClient.setQueryData(['servers'], (old: any) =>
          old?.map((server: any) =>
            server.id === serverId
              ? {
                  ...server,
                  categories: server.categories?.map((cat: any) =>
                    cat.id === categoryId
                      ? { ...cat, channels: [...(cat.channels || []), { id: tempChannel.id, name, type }] }
                      : cat
                  ) || []
                }
              : server
          )
        );
      }
      
      return { previousChannels, previousServers, serverId };
    },
    onError: (_, __, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', context.serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la création du salon');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
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
    onMutate: async ({ serverId, orderedIds }) => {
      // Lock Realtime updates during mutation
      mutationLockRef.current = true;
      
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      if (previousChannels) {
        // Reorder categories based on orderedIds
        const reorderedCategories = orderedIds
          .map(id => previousChannels.categories.find(cat => cat.id === id))
          .filter((cat): cat is CategoryWithChannels => !!cat)
          .map((cat, index) => ({ ...cat, position: index }));
        
        queryClient.setQueryData(['channels', serverId], {
          ...previousChannels,
          categories: reorderedCategories
        });
      }
      
      // Also update servers cache
      if (previousServers) {
        queryClient.setQueryData(['servers'], (old: any) =>
          old?.map((server: any) =>
            server.id === serverId
              ? {
                  ...server,
                  categories: orderedIds
                    .map(id => server.categories?.find((c: any) => c.id === id))
                    .filter(Boolean)
                    .map((c: any, i: number) => ({ ...c, position: i }))
                }
              : server
          )
        );
      }
      
      return { previousChannels, previousServers, serverId };
    },
    onError: (_, __, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', context.serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors du réordonnancement');
    },
    onSettled: (_, __, { serverId }) => {
      // Unlock Realtime after a delay to let optimistic update settle
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
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
      // Lock Realtime updates during mutation
      mutationLockRef.current = true;
      
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      // Snapshot previous values
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      if (previousChannels) {
        // Apply optimistic update
        const allChannels = [
          ...previousChannels.categories.flatMap(c => c.channels),
          ...previousChannels.orphanChannels
        ];
        
        const movedChannels = orderedIds
          .map(id => allChannels.find(ch => ch.id === id))
          .filter((ch): ch is ChannelWithCategory => !!ch)
          .map((ch, index) => ({ ...ch, category_id: categoryId, position: index }));
        
        const movedIds = new Set(orderedIds);
        
        const newCategories = previousChannels.categories.map(cat => ({
          ...cat,
          channels: cat.id === categoryId 
            ? movedChannels
            : cat.channels.filter(ch => !movedIds.has(ch.id))
        }));
        
        const newOrphans = categoryId === null 
          ? movedChannels
          : previousChannels.orphanChannels.filter(ch => !movedIds.has(ch.id));
        
        queryClient.setQueryData(['channels', serverId], {
          categories: newCategories,
          orphanChannels: newOrphans
        });
      }
      
      // Also update servers cache
      if (previousServers) {
        queryClient.setQueryData(['servers'], (old: any) =>
          old?.map((server: any) =>
            server.id === serverId
              ? {
                  ...server,
                  categories: server.categories?.map((cat: any) => {
                    const movedIds = new Set(orderedIds);
                    if (cat.id === categoryId) {
                      const allChs = server.categories?.flatMap((c: any) => c.channels || []) || [];
                      return {
                        ...cat,
                        channels: orderedIds
                          .map(id => allChs.find((ch: any) => ch.id === id))
                          .filter(Boolean)
                      };
                    }
                    return {
                      ...cat,
                      channels: (cat.channels || []).filter((ch: any) => !movedIds.has(ch.id))
                    };
                  }) || []
                }
              : server
          )
        );
      }
      
      return { previousChannels, previousServers, serverId };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', context.serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
    },
    onSettled: (_, __, { serverId }) => {
      // Unlock Realtime after a delay to let optimistic update settle
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}
