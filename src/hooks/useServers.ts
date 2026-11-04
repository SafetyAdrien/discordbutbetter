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
    icon: string | null;
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

export function useServers(options?: { prioritizeServerId?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  // Several components mount their own instance of this hook simultaneously
  // (e.g. ServerList and Index) — suffix realtime channel names per instance
  // so they don't collide on the same Supabase Realtime topic.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));
  const prioritizeServerId = options?.prioritizeServerId;

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
      .channel(`servers-rt-${instanceIdRef.current}`)
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
                    icon_url: 'icon_url' in next ? next.icon_url ?? null : s.icon_url,
                    banner_url: 'banner_url' in next ? next.banner_url ?? null : s.banner_url,
                    description: 'description' in next ? next.description ?? null : s.description,
                    is_public: next.is_public ?? s.is_public,
                    owner_id: next.owner_id ?? s.owner_id,
                    // null is a valid value here, so use `in` to detect presence
                    secondary_owner_id:
                      'secondary_owner_id' in next ? next.secondary_owner_id ?? null : s.secondary_owner_id,
                  }
                : s
            )
          );

          // If ownership changed, also refresh members/permissions + reconcile local intent
          if (
            prev?.owner_id !== next.owner_id ||
            prev?.secondary_owner_id !== next.secondary_owner_id
          ) {
            reconcileSecondaryOwnerFromRealtime(next.id, next.secondary_owner_id ?? null);
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

  // Realtime on server_members for the current user — kick / leave / join from another device
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`server-members-rt:${user.id}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_members', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['servers'] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);


  // Persist user id so a cold mount can read the previous user's server cache
  // BEFORE supabase.auth.getSession() resolves — otherwise the first paint is
  // an empty server list on mobile (where getSession() can take ~1s).
  const lastUserId = (() => {
    if (user?.id) {
      try { window.localStorage.setItem('nexuschat:lastUserId', user.id); } catch {}
      return user.id;
    }
    try { return window.localStorage.getItem('nexuschat:lastUserId'); } catch { return null; }
  })();

  const queryCachedServers = queryClient.getQueryData<ServerWithDetails[]>(['servers']);
  const persistedServers = lastUserId ? cacheGetSync<ServerWithDetails[]>(`servers:${lastUserId}`) : undefined;
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

      // Stable deterministic order for servers not covered by user's custom order
      servers.sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return ta - tb;
      });

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

  // Background prefetch: warm the channels cache so switching servers is
  // instantaneous (rendered from cache, no network wait).
  //
  // It previously fetched the channels of EVERY server the user belongs to as
  // soon as the list arrived: for a user in 50 servers that is 100+ queries
  // fired during initial load, competing with the data needed for the screen
  // the user is actually looking at. We now prioritise the server being viewed
  // and only opportunistically warm the others when idle.
  const prefetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!query.data || !user) return;
    const serverIds = query.data.map((s) => s.id);
    const toPrefetch = serverIds.filter((id) => {
      if (prefetchedRef.current.has(id)) return false;
      const existing = queryClient.getQueryData<{ categories: any[]; orphanChannels: any[] }>(['channels', id]);
      if (existing && (existing.categories.length > 0 || existing.orphanChannels.length > 0)) return false;
      const persisted = cacheGetSync<{ categories: any[]; orphanChannels: any[] }>(`channels:${id}`);
      if (persisted && (persisted.categories.length > 0 || persisted.orphanChannels.length > 0)) {
        // Seed React Query from persisted IDB cache without hitting the network.
        queryClient.setQueryData(['channels', id], persisted);
        prefetchedRef.current.add(id);
        return false;
      }
      return true;
    });
    if (toPrefetch.length === 0) return;

    let cancelled = false;
    const MAX_PARALLEL = 3;
    // The server the user is currently looking at goes first.
    const queue = [
      ...toPrefetch.filter((id) => id === prioritizeServerId),
      ...toPrefetch.filter((id) => id !== prioritizeServerId),
    ];

    const fetchOne = async (serverId: string) => {
      prefetchedRef.current.add(serverId);
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ['channels', serverId],
          queryFn: async () => {
            const { data: categories, error: catError } = await supabase
              .from('categories')
              .select('id, name, icon, position')
              .eq('server_id', serverId)
              .order('position', { ascending: true });
            if (catError) throw catError;

            const { data: channels, error: chanError } = await supabase
              .from('channels')
              .select('id, name, type, description, position, category_id, server_id, icon_url')
              .eq('server_id', serverId)
              .order('position', { ascending: true });
            if (chanError) throw chanError;

            const categorizedChannels = (categories ?? []).map((cat) => ({
              ...cat,
              channels: (channels ?? [])
                .filter((ch) => ch.category_id === cat.id)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
            }));
            const orphanChannels = (channels ?? [])
              .filter((ch) => !ch.category_id)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            return { categories: categorizedChannels, orphanChannels };
          },
          staleTime: 5 * 60 * 1000,
        });
        if (!cancelled && data) {
          cacheSetAsync(`channels:${serverId}`, data);
        }
      } catch {
        prefetchedRef.current.delete(serverId);
      }
    };

    const workers = Array.from({ length: Math.min(MAX_PARALLEL, queue.length) }, async () => {
      while (!cancelled && queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        await fetchOne(next);
      }
    });
    Promise.all(workers).catch(() => {});

    return () => { cancelled = true; };
  }, [query.data, user, queryClient, prioritizeServerId]);

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
  },
  local: {
    categories: [
      { name: 'INFORMATION', channels: [
        { name: 'bienvenue', type: 'text' },
        { name: 'annonces', type: 'announcement' },
        { name: 'événements', type: 'calendar' }
      ]},
      { name: 'GÉNÉRAL', channels: [
        { name: 'général', type: 'text' },
        { name: 'entraide', type: 'forum' }
      ]},
      { name: 'VOCAL', channels: [
        { name: 'Salon vocal', type: 'voice' }
      ]}
    ]
  },
  creators: {
    categories: [
      { name: 'INFORMATION', channels: [
        { name: 'annonces', type: 'announcement' },
        { name: 'règles', type: 'text' }
      ]},
      { name: 'CRÉATIONS', channels: [
        { name: 'galerie', type: 'media' },
        { name: 'retours', type: 'forum' },
        { name: 'projets', type: 'tasks' }
      ]},
      { name: 'GÉNÉRAL', channels: [
        { name: 'général', type: 'text' }
      ]},
      { name: 'VOCAL', channels: [
        { name: 'Atelier', type: 'voice' }
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
              position: catIndex + 2, // Start after the two default categories (textuels, vocaux)
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
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['public-servers'] });
    },
  });
}
