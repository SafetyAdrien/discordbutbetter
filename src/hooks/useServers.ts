import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { timeAsync } from '@/lib/perf';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { reconcileSecondaryOwnerFromRealtime } from './useSecondaryOwner';


export interface ServerWithDetails {
  id: string;
  name: string;
  icon_url: string | null;
  banner_url: string | null;
  description: string | null;
  is_public: boolean;
  owner_id: string | null;
  secondary_owner_id: string | null;
  created_at: string | null;
  categories: {
    id: string;
    name: string;
    position: number | null;
    channels: {
      id: string;
      name: string;
      type: 'text' | 'voice' | 'announcement' | 'forum' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link' | null;
      description: string | null;
      position: number | null;
      icon_url: string | null;
    }[];
  }[];
  orphanChannels?: {
    id: string;
    name: string;
    type: 'text' | 'voice' | 'announcement' | 'forum' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link' | null;
    description: string | null;
    position: number | null;
    category_id: null;
    server_id: string;
    icon_url?: string | null;
  }[];
}

export function useServers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const getServerScore = (servers?: ServerWithDetails[]) => {
    if (!servers) return -1;
    return servers.reduce((sum, server) => {
      const categoryCount = server.categories?.length ?? 0;
      const channelCount = (server.categories ?? []).reduce((count, category) => count + category.channels.length, 0);
      const orphanCount = server.orphanChannels?.length ?? 0;
      return sum + 1 + categoryCount + channelCount + orphanCount;
    }, 0);
  };

  // Realtime subscription on servers table — patch cache instantly for ownership changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('servers-rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'servers' },
        (payload) => {
          const next = payload.new as Partial<ServerWithDetails> & { id: string };
          const prev = payload.old as Partial<ServerWithDetails> & { id?: string };

          // Instant patch: apply scalar fields (owner_id, secondary_owner_id, name, icon, banner, description, is_public)
          queryClient.setQueryData<ServerWithDetails[]>(['servers'], (old) =>
            old?.map((s) =>
              s.id === next.id
                ? {
                    ...s,
                    name: next.name ?? s.name,
                    icon_url: next.icon_url ?? s.icon_url,
                    banner_url: next.banner_url ?? s.banner_url,
                    description: next.description ?? s.description,
                    is_public: next.is_public ?? s.is_public,
                    owner_id: next.owner_id ?? s.owner_id,
                    // null is a valid value here, so use `in` to detect presence
                    secondary_owner_id:
                      'secondary_owner_id' in next ? next.secondary_owner_id ?? null : s.secondary_owner_id,
                  }
                : s
            )
          );

          // If ownership changed, also refresh members/permissions
          if (
            prev?.owner_id !== next.owner_id ||
            prev?.secondary_owner_id !== next.secondary_owner_id
          ) {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['permissions'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'servers' },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
          }, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'servers' },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (oldId) {
            queryClient.setQueryData<ServerWithDetails[]>(['servers'], (old) =>
              old?.filter((s) => s.id !== oldId)
            );
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);


  const queryCachedServers = queryClient.getQueryData<ServerWithDetails[]>(['servers']);
  const persistedServers = user?.id ? cacheGetSync<ServerWithDetails[]>(`servers:${user.id}`) : undefined;
  const cachedServers = [queryCachedServers, persistedServers].reduce<ServerWithDetails[] | undefined>(
    (best, candidate) => (getServerScore(candidate) > getServerScore(best) ? candidate : best),
    undefined
  );

  const query = useQuery({
    queryKey: ['servers'],
    queryFn: () => timeAsync('query:servers', async (): Promise<ServerWithDetails[]> => {
      if (!user) return [];

      const cachedChannelsByServer = new Map(
        (cachedServers ?? []).map((server) => [
          server.id,
          {
            categories: server.categories ?? [],
            orphanChannels: server.orphanChannels ?? [],
          },
        ])
      );

      const { data, error } = await supabase
        .from('server_members')
        .select(`
          server:servers (
            id,
            name,
            icon_url,
            banner_url,
            description,
            is_public,
            owner_id,
            secondary_owner_id,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const servers = data
        ?.map((m) => m.server)
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((server) => {
          const cachedChannels = cachedChannelsByServer.get(server.id);

          return {
            id: server.id,
            name: server.name,
            icon_url: server.icon_url,
            banner_url: server.banner_url,
            description: server.description,
            is_public: server.is_public,
            owner_id: server.owner_id,
            secondary_owner_id: server.secondary_owner_id,
            created_at: server.created_at,
            categories: cachedChannels?.categories || [],
            orphanChannels: cachedChannels?.orphanChannels || [],
          };
        }) ?? [];

      return servers;
    }),
    enabled: !!user,
    initialData: cachedServers,
    initialDataUpdatedAt: cachedServers ? Date.now() : 0,
    staleTime: cachedServers ? 5 * 60 * 1000 : 0,
    refetchOnMount: cachedServers ? false : true,
    refetchOnWindowFocus: false,
  });

  // Persist to IndexedDB
  useEffect(() => {
    if (query.data && user?.id && !query.isPlaceholderData) {
      cacheSetAsync(`servers:${user.id}`, query.data);
    }
  }, [query.data, user?.id, query.isPlaceholderData]);

  return query;
}

export function usePublicServers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['public-servers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select(`
          id,
          name,
          icon_url,
          description,
          is_public,
          owner_id,
          server_members (count)
        `)
        .eq('is_public', true);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Server templates with pre-configured categories and channels
const serverTemplates: Record<string, { categories: { name: string; channels: { name: string; type: 'text' | 'voice' | 'announcement' | 'forum' | 'media' | 'calendar' | 'tasks' }[] }[] }> = {
  gaming: {
    categories: [
      { name: 'INFORMATION', channels: [
        { name: 'règles', type: 'text' },
        { name: 'annonces', type: 'announcement' }
      ]},
      { name: 'GÉNÉRAL', channels: [
        { name: 'général', type: 'text' },
        { name: 'médias', type: 'media' }
      ]},
      { name: 'VOCAL', channels: [
        { name: 'Salon vocal', type: 'voice' },
        { name: 'Gaming', type: 'voice' }
      ]}
    ]
  },
  friends: {
    categories: [
      { name: 'GÉNÉRAL', channels: [
        { name: 'général', type: 'text' },
        { name: 'photos', type: 'media' }
      ]},
      { name: 'VOCAL', channels: [
        { name: 'Discuter', type: 'voice' }
      ]}
    ]
  },
  study: {
    categories: [
      { name: 'COURS', channels: [
        { name: 'ressources', type: 'text' },
        { name: 'devoirs', type: 'tasks' }
      ]},
      { name: 'DISCUSSIONS', channels: [
        { name: 'général', type: 'text' },
        { name: 'questions', type: 'forum' }
      ]},
      { name: 'VOCAL', channels: [
        { name: 'Étude', type: 'voice' }
      ]}
    ]
  },
  school: {
    categories: [
      { name: 'ANNONCES', channels: [
        { name: 'annonces', type: 'announcement' },
        { name: 'événements', type: 'calendar' }
      ]},
      { name: 'GÉNÉRAL', channels: [
        { name: 'général', type: 'text' },
        { name: 'discussions', type: 'forum' }
      ]},
      { name: 'VOCAL', channels: [
        { name: 'Réunion', type: 'voice' }
      ]}
    ]
  }
};

export function useCreateServer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      icon_url,
      banner_url,
      iconFile,
      bannerFile,
      description,
      is_public,
      templateId,
    }: {
      name: string;
      icon_url?: string;
      banner_url?: string;
      iconFile?: File | null;
      bannerFile?: File | null;
      description?: string;
      is_public?: boolean;
      templateId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Create server first (without icon/banner so we have its id for storage RLS)
      const { data: server, error } = await supabase
        .from('servers')
        .insert({
          name,
          icon_url: icon_url || null,
          banner_url: banner_url || null,
          description: description || null,
          is_public: is_public ?? false,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload icon/banner using server.id as folder (required by storage RLS)
      const uploadToBucket = async (file: File, bucket: string): Promise<string> => {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${server.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
        if (upErr) throw upErr;
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      };

      const patch: { icon_url?: string; banner_url?: string } = {};
      if (iconFile) patch.icon_url = await uploadToBucket(iconFile, 'server-icons');
      if (bannerFile) patch.banner_url = await uploadToBucket(bannerFile, 'server-banners');

      if (patch.icon_url || patch.banner_url) {
        const { data: updated, error: updErr } = await supabase
          .from('servers')
          .update(patch)
          .eq('id', server.id)
          .select()
          .single();
        if (!updErr && updated) Object.assign(server, updated);
      }

      // If template selected, create additional categories and channels
      if (templateId && serverTemplates[templateId]) {
        const template = serverTemplates[templateId];
        
        for (let catIndex = 0; catIndex < template.categories.length; catIndex++) {
          const catTemplate = template.categories[catIndex];
          
          // Create category
          const { data: category, error: catError } = await supabase
            .from('categories')
            .insert({
              server_id: server.id,
              name: catTemplate.name,
              position: catIndex + 1, // Start after default category
            })
            .select()
            .single();

          if (catError) {
            console.error('Error creating category:', catError);
            continue;
          }

          // Create channels in this category
          for (let chIndex = 0; chIndex < catTemplate.channels.length; chIndex++) {
            const chTemplate = catTemplate.channels[chIndex];
            
            const { error: chError } = await supabase
              .from('channels')
              .insert({
                server_id: server.id,
                category_id: category.id,
                name: chTemplate.name,
                type: chTemplate.type,
                position: chIndex,
              });

            if (chError) {
              console.error('Error creating channel:', chError);
            }
          }
        }
      }

      return server;
    },
    onMutate: async ({ name, icon_url, description, is_public }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData(['servers']);
      
      const tempServer: ServerWithDetails = {
        id: `temp-${Date.now()}`,
        name,
        icon_url: icon_url || null,
        banner_url: null,
        description: description || null,
        is_public: is_public ?? false,
        owner_id: user.id,
        secondary_owner_id: null,
        created_at: new Date().toISOString(),
        categories: [],
      };
      
      queryClient.setQueryData(['servers'], (old: ServerWithDetails[] | undefined) =>
        old ? [...old, tempServer] : [tempServer]
      );
      
      return { previousServers };
    },
    onError: (error, _, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la création du serveur');
      console.error('Create server error:', error);
    },
    onSuccess: () => {
      toast.success('Serveur créé avec succès !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useJoinServer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('server_members')
        .insert({
          server_id: serverId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData(['servers']);
      
      return { previousServers };
    },
    onError: (error: any, _, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      if (error.message?.includes('duplicate')) {
        toast.error('Vous êtes déjà membre de ce serveur');
      } else {
        toast.error('Erreur lors de la connexion au serveur');
      }
      console.error('Join server error:', error);
    },
    onSuccess: () => {
      toast.success('Vous avez rejoint le serveur !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['public-servers'] });
    },
  });
}
