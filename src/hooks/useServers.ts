import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
    }[];
  }[];
}

export function useServers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['servers', user?.id],
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
                position
              )
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Extract and sort servers
      const servers = data
        ?.map((m) => m.server)
        .filter((s): s is ServerWithDetails => s !== null)
        .map((server) => ({
          ...server,
          categories: server.categories
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((cat) => ({
              ...cat,
              channels: cat.channels.sort(
                (a, b) => (a.position ?? 0) - (b.position ?? 0)
              ),
            })),
        })) ?? [];

      return servers;
    },
    enabled: !!user,
  });
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
      description,
      is_public,
      templateId,
    }: {
      name: string;
      icon_url?: string;
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
      
      await queryClient.cancelQueries({ queryKey: ['servers', user.id] });
      const previousServers = queryClient.getQueryData(['servers', user.id]);
      
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
      
      queryClient.setQueryData(['servers', user.id], (old: ServerWithDetails[] | undefined) =>
        old ? [...old, tempServer] : [tempServer]
      );
      
      return { previousServers };
    },
    onError: (error, _, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers', user?.id], context.previousServers);
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
      
      await queryClient.cancelQueries({ queryKey: ['servers', user.id] });
      const previousServers = queryClient.getQueryData(['servers', user.id]);
      
      return { previousServers };
    },
    onError: (error: any, _, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers', user?.id], context.previousServers);
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
