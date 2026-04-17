import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      type: 'text' | 'voice' | 'announcement' | 'forum' | null;
      description: string | null;
      position: number | null;
      icon_url: string | null;
    }[];
  }[];
  orphanChannels?: {
    id: string;
    name: string;
    type: 'text' | 'voice' | 'announcement' | 'forum' | null;
    description: string | null;
    position: number | null;
    category_id: null;
    server_id: string;
  }[];
}

export function useServers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Realtime subscription on servers table for name/icon/banner changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('servers-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servers' },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const cachedServers = user?.id ? cacheGetSync<ServerWithDetails[]>(`servers:${user.id}`) : undefined;

  const query = useQuery({
    queryKey: ['servers'],
    queryFn: async (): Promise<ServerWithDetails[]> => {
      if (!user) return [];

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
            created_at,
            categories (
              id,
              name,
              position,
              channels (
                id,
                name,
                type,
                description,
                position,
                icon_url
              )
            ),
            channels (
              id,
              name,
              type,
              description,
              position,
              category_id,
              icon_url
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const servers = data
        ?.map((m) => m.server)
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((server) => {
          const allChannels = (server as any).channels || [];
          const orphanChannels = allChannels
            .filter((ch: any) => !ch.category_id)
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            .map((ch: any) => ({
              id: ch.id,
              name: ch.name,
              type: ch.type,
              description: ch.description,
              position: ch.position,
              icon_url: ch.icon_url || null,
              category_id: null as null,
              server_id: server.id,
            }));

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
            categories: (server.categories || [])
              .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
              .map((cat: any) => ({
                ...cat,
                channels: (cat.channels || []).sort(
                  (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
                ),
              })),
            orphanChannels,
          };
        }) ?? [];

      return servers;
    },
    enabled: !!user,
    initialData: cachedServers,
    initialDataUpdatedAt: cachedServers ? Date.now() : 0,
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
      description,
      is_public,
      templateId,
    }: {
      name: string;
      icon_url?: string;
      banner_url?: string;
      description?: string;
      is_public?: boolean;
      templateId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Create server first
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
