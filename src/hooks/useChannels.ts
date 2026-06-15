import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { timeAsync } from '@/lib/perf';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ChannelType = 'text' | 'voice' | 'announcement' | 'forum' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link';

export interface ChannelWithCategory {
  id: string;
  name: string;
  type: ChannelType | null;
  description: string | null;
  position: number | null;
  category_id: string | null;
  server_id: string;
  icon_url: string | null;
}

export interface CategoryWithChannels {
  id: string;
  name: string;
  position: number | null;
  channels: ChannelWithCategory[];
}

export interface OrphanChannel extends ChannelWithCategory {}

// Shared ref to prevent Realtime conflicts during mutations
export const mutationLockRef = { current: false };

/**
 * Swap a temporary channel id for its real id across all caches.
 * Used after an optimistic insert/duplicate succeeds — avoids a refetch
 * (and the associated flicker) by patching the data we already have.
 */
function swapTempChannelId(
  queryClient: ReturnType<typeof useQueryClient>,
  serverId: string,
  tempId: string,
  realId: string,
  patch?: Partial<ChannelWithCategory>,
  userId?: string,
) {
  const swap = (ch: any) => (ch?.id === tempId ? { ...ch, ...patch, id: realId } : ch);

  // ['channels', serverId]
  const channels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
  if (channels) {
    queryClient.setQueryData(['channels', serverId], {
      categories: channels.categories.map((cat) => ({ ...cat, channels: cat.channels.map(swap) })),
      orphanChannels: channels.orphanChannels.map(swap),
    });
  }

  // ['servers', ...]
  const serversQueries = queryClient.getQueriesData<any[]>({ queryKey: ['servers'] });
  for (const [key, serversData] of serversQueries) {
    if (!Array.isArray(serversData)) continue;
    queryClient.setQueryData(key, serversData.map((s: any) => {
      if (s.id !== serverId) return s;
      return {
        ...s,
        categories: (s.categories || []).map((cat: any) => ({
          ...cat,
          channels: (cat.channels || []).map(swap),
        })),
        orphanChannels: (s.orphanChannels || []).map(swap),
      };
    }));
  }

  // Permissions cache
  if (userId) {
    const permKey = ['server-channel-permissions', serverId, userId];
    const perms = queryClient.getQueryData<{ viewable: Set<string>; connectable: Set<string>; tracked?: Set<string> }>(permKey);
    if (perms) {
      const next = {
        viewable: new Set(perms.viewable),
        connectable: new Set(perms.connectable),
        tracked: perms.tracked ? new Set(perms.tracked) : undefined,
      };
      if (next.viewable.delete(tempId)) next.viewable.add(realId);
      if (next.connectable.delete(tempId)) next.connectable.add(realId);
      if (next.tracked?.delete(tempId)) next.tracked.add(realId);
      queryClient.setQueryData(permKey, next);
    }
  }
}

export function useChannels(
  serverId: string | null,
  initialData?: { categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const getChannelCount = (data?: { categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }) => {
    if (!data) return -1;
    return data.categories.reduce((sum, category) => sum + category.channels.length, 0) + data.orphanChannels.length;
  };

  const hasAnyChannel = (data?: { categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }) =>
    !!data && getChannelCount(data) > 0;

  // Realtime subscription for channels and categories
  useEffect(() => {
    if (!serverId || !user) return;

    const channelsChannel = supabase
      .channel(`channels-rt-${serverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `server_id=eq.${serverId}`
        },
        () => {
          if (mutationLockRef.current) return;
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
            queryClient.invalidateQueries({ queryKey: ['servers'] });
          }, 300);
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel(`categories-rt-${serverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `server_id=eq.${serverId}`
        },
        () => {
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
      supabase.removeChannel(channelsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [serverId, user, queryClient]);

  const queryCachedChannels = serverId
    ? queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId])
    : undefined;
  const persistedChannels = serverId
    ? cacheGetSync<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(`channels:${serverId}`)
    : undefined;
  const bestCachedChannels = [queryCachedChannels, persistedChannels, initialData].reduce<
    { categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] } | undefined
  >((best, candidate) => {
    return getChannelCount(candidate) > getChannelCount(best) ? candidate : best;
  }, undefined);
  const hasUsableCachedChannels = hasAnyChannel(bestCachedChannels);
  const cachedChannels = hasUsableCachedChannels ? bestCachedChannels : undefined;

  const query = useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => timeAsync(`query:channels(${serverId ?? 'none'})`, async (): Promise<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }> => {
      if (!serverId) return { categories: [], orphanChannels: [] };

      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, position')
        .eq('server_id', serverId)
        .order('position', { ascending: true });

      if (catError) throw catError;

      const { data: channels, error: chanError } = await supabase
        .from('channels')
        .select('id, name, type, description, position, category_id, server_id, icon_url')
        .eq('server_id', serverId)
        .order('position', { ascending: true });

      if (chanError) throw chanError;

      const categorizedChannels = categories.map((cat) => ({
        ...cat,
        channels: channels
          .filter((ch) => ch.category_id === cat.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }));

      const orphanChannels = channels
        .filter((ch) => !ch.category_id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      return { categories: categorizedChannels, orphanChannels };
    }),
    enabled: !!serverId && !!user,
    initialData: cachedChannels,
    initialDataUpdatedAt: cachedChannels ? Date.now() : 0,
    staleTime: hasUsableCachedChannels ? 5 * 60 * 1000 : 0,
    refetchOnMount: hasUsableCachedChannels ? false : true,
    refetchOnWindowFocus: false,
  });

  // Persist channels cache to sessionStorage
  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      cacheSetAsync(`channels:${serverId}`, query.data);
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
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
      mutationLockRef.current = true;

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
    onError: (error: any, __, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', context.serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      const errorMessage = error?.message || error?.code || 'Erreur inconnue';
      console.error('[useCreateCategory] Error:', error);
      toast.error(`Erreur lors de la création: ${errorMessage}`);
    },
    onSettled: (_, __, { serverId }) => {
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 500);
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      serverId,
      categoryId,
      name,
      type,
      description,
    }: {
      serverId: string;
      categoryId: string | null;
      name: string;
      type: ChannelType;
      description?: string;
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
          type: type as any,
          position: nextPosition,
          ...(description ? { description } : {}),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ serverId, categoryId, name, type }) => {
      mutationLockRef.current = true;

      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      const tempId = `temp-${Date.now()}`;
      const tempChannel: ChannelWithCategory = {
        id: tempId,
        name,
        type,
        description: null,
        position: 0,
        category_id: categoryId,
        server_id: serverId,
        icon_url: null,
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
                      ? { ...cat, channels: [...(cat.channels || []), { id: tempId, name, type }] }
                      : cat
                  ) || []
                }
              : server
          )
        );
      }

      // Inject temp channel into permissions cache so visibility filter passes
      if (user) {
        const permKey = ['server-channel-permissions', serverId, user.id];
        const prevPerms = queryClient.getQueryData<{ viewable: Set<string>; connectable: Set<string> }>(permKey);
        if (prevPerms) {
          const newViewable = new Set(prevPerms.viewable);
          const newConnectable = new Set(prevPerms.connectable);
          newViewable.add(tempId);
          newConnectable.add(tempId);
          queryClient.setQueryData(permKey, { viewable: newViewable, connectable: newConnectable });
        }
      }
      
      return { previousChannels, previousServers, serverId, tempId };
    },
    onSuccess: (data, { serverId }, context) => {
      // Swap temp id for the real one across all caches — no refetch, no flicker.
      if (context?.tempId && data?.id) {
        swapTempChannelId(queryClient, serverId, context.tempId, data.id, data as Partial<ChannelWithCategory>, user?.id);
      }
      toast.success('Salon créé');
    },
    onError: (error: any) => {
      // No rollback — keep the optimistic state. Realtime will reconcile if the
      // server diverges. Only surface the error to the user.
      const errorMessage = error?.message || error?.code || 'Erreur inconnue';
      console.error('[useCreateChannel] Error:', error);
      toast.error(`Erreur lors de la création: ${errorMessage}`);
    },
    onSettled: () => {
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 500);
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
      mutationLockRef.current = true;

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
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 500);
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
      mutationLockRef.current = true;

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
    onError: () => {
      // No rollback — keep the optimistic deletion. Realtime will reconcile if needed.
      toast.error('Erreur lors de la suppression');
    },
    onSettled: () => {
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 500);
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
    onSettled: () => {
      // Keep the optimistic order visible immediately; Realtime will reconcile later.
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 800);
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

export function useDuplicateChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      channelId,
      serverId,
      name: overrideName,
    }: {
      channelId: string;
      serverId: string;
      name?: string;
    }) => {
      // Fetch the original channel
      const { data: original, error: fetchError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (fetchError || !original) throw fetchError || new Error('Channel not found');

      // Position the duplicate right after the original
      const newPosition = (original.position ?? 0) + 1;

      // Shift all channels with position >= newPosition in the same category/orphan group
      if (original.category_id) {
        const { data: toShift } = await supabase
          .from('channels')
          .select('id, position')
          .eq('category_id', original.category_id)
          .gte('position', newPosition)
          .neq('id', channelId)
          .order('position', { ascending: false });
        if (toShift) {
          for (const ch of toShift) {
            await supabase
              .from('channels')
              .update({ position: (ch.position ?? 0) + 1 })
              .eq('id', ch.id);
          }
        }
      } else {
        const { data: toShift } = await supabase
          .from('channels')
          .select('id, position')
          .eq('server_id', serverId)
          .is('category_id', null)
          .gte('position', newPosition)
          .neq('id', channelId)
          .order('position', { ascending: false });
        if (toShift) {
          for (const ch of toShift) {
            await supabase
              .from('channels')
              .update({ position: (ch.position ?? 0) + 1 })
              .eq('id', ch.id);
          }
        }
      }

      const finalName = overrideName?.trim() || original.name;

      // Create duplicate with icon_url
      const { data, error } = await supabase
        .from('channels')
        .insert({
          server_id: serverId,
          category_id: original.category_id,
          name: finalName,
          type: original.type,
          description: original.description,
          icon_url: original.icon_url,
          position: newPosition,
        })
        .select()
        .single();

      if (error) throw error;

      // Copy channel permission overrides if any
      const { data: permissions } = await supabase
        .from('channel_permission_overrides')
        .select('*')
        .eq('channel_id', channelId);

      if (permissions && permissions.length > 0) {
        await supabase.from('channel_permission_overrides').insert(
          permissions.map((p) => ({
            channel_id: data.id,
            role_id: p.role_id,
            permission: p.permission,
            type: p.type,
            sync_with_category: p.sync_with_category,
          }))
        );
      }

      return { ...data, serverId };
    },
    onMutate: async ({ channelId, serverId, name: overrideName }) => {
      mutationLockRef.current = true;

      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });

      // Snapshot channels cache
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      
      // Snapshot ALL servers queries (key includes userId suffix)
      const previousServersQueries = queryClient.getQueriesData<any[]>({ queryKey: ['servers'] });

      // Find original channel info for building temp channel
      let original: any | undefined;
      if (previousChannels) {
        for (const cat of previousChannels.categories) {
          original = cat.channels.find((ch: any) => ch.id === channelId);
          if (original) break;
        }
        if (!original) {
          original = previousChannels.orphanChannels.find((ch: any) => ch.id === channelId);
        }
      }

      const newPosition = (original?.position ?? 0) + 1;
      const tempId = `temp-dup-${Date.now()}`;
      const finalName = overrideName?.trim() || original?.name;
      const tempChannel = original ? { ...original, id: tempId, name: finalName, position: newPosition, created_at: new Date().toISOString() } : null;

      // 1) Update ['channels', serverId] cache
      if (previousChannels && original && tempChannel) {
        if (original.category_id) {
          queryClient.setQueryData(['channels', serverId], {
            categories: previousChannels.categories.map(cat => ({
              ...cat,
              channels: cat.id === original.category_id
                ? [...cat.channels.map((ch: any) =>
                    ch.id !== channelId && (ch.position ?? 0) >= newPosition
                      ? { ...ch, position: (ch.position ?? 0) + 1 }
                      : ch
                  ), tempChannel].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
                : cat.channels
            })),
            orphanChannels: previousChannels.orphanChannels
          });
        } else {
          const shifted = [
            ...previousChannels.orphanChannels.map((ch: any) =>
              ch.id !== channelId && (ch.position ?? 0) >= newPosition
                ? { ...ch, position: (ch.position ?? 0) + 1 }
                : ch
            ),
            tempChannel
          ].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
          queryClient.setQueryData(['channels', serverId], {
            categories: previousChannels.categories,
            orphanChannels: shifted
          });
        }
      }

      // 2) Update ['servers', ...] cache (what ChannelList actually renders)
      if (original && tempChannel) {
        const simpleTempChannel = {
          id: tempId,
          name: finalName,
          type: original.type,
          description: original.description,
          position: newPosition,
        };

        for (const [queryKey, serversData] of previousServersQueries) {
          if (!Array.isArray(serversData)) continue;
          queryClient.setQueryData(queryKey, serversData.map((server: any) => {
            if (server.id !== serverId) return server;
            
            if (original.category_id) {
              return {
                ...server,
                categories: server.categories.map((cat: any) => {
                  if (cat.id !== original.category_id) return cat;
                  const updatedChannels = [
                    ...cat.channels.map((ch: any) =>
                      ch.id !== channelId && (ch.position ?? 0) >= newPosition
                        ? { ...ch, position: (ch.position ?? 0) + 1 }
                        : ch
                    ),
                    simpleTempChannel
                  ].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
                  return { ...cat, channels: updatedChannels };
                }),
              };
            } else {
              const updatedOrphans = [
                ...(server.orphanChannels || []).map((ch: any) =>
                  ch.id !== channelId && (ch.position ?? 0) >= newPosition
                    ? { ...ch, position: (ch.position ?? 0) + 1 }
                    : ch
                ),
                { ...simpleTempChannel, category_id: null, server_id: serverId }
              ].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
              return { ...server, orphanChannels: updatedOrphans };
            }
          }));
        }
      }

      // 3) Add temp channel to permissions cache so visibility filter passes
      if (tempChannel) {
        const permKey = ['server-channel-permissions', serverId, user?.id];
        const prevPerms = queryClient.getQueryData<{ viewable: Set<string>; connectable: Set<string> }>(permKey);
        if (prevPerms) {
          const newViewable = new Set(prevPerms.viewable);
          const newConnectable = new Set(prevPerms.connectable);
          newViewable.add(tempId);
          newConnectable.add(tempId);
          queryClient.setQueryData(permKey, { viewable: newViewable, connectable: newConnectable });
        }
      }

      return { previousChannels, previousServersQueries, serverId, tempId };
    },
    onSuccess: (data, _vars, context) => {
      const sid = context?.serverId || data.serverId;
      // Swap the temp duplicate id for the real one across all caches — no refetch.
      if (context?.tempId && data?.id) {
        swapTempChannelId(queryClient, sid, context.tempId, data.id, data as Partial<ChannelWithCategory>, user?.id);
      }
      toast.success('Salon dupliqué avec succès');
    },
    onError: () => {
      // No rollback — keep the optimistic duplicate visible. Realtime will reconcile.
      toast.error('Erreur lors de la duplication du salon');
    },
    onSettled: () => {
      setTimeout(() => {
        mutationLockRef.current = false;
      }, 500);
    },
  });
}
