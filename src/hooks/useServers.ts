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

export function useCreateServer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      icon_url,
      description,
      is_public,
    }: {
      name: string;
      icon_url?: string;
      description?: string;
      is_public?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
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
      return data;
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
