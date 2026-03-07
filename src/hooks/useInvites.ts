import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Invite {
  id: string;
  server_id: string;
  code: string;
  created_by: string | null;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  is_permanent: boolean;
  created_at: string;
  creator?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
}

export function useServerInvites(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`invites-rt-${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invites', filter: `server_id=eq.${serverId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  const query = useQuery({
    queryKey: ['invites', serverId],
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:invites:${serverId}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
    queryFn: async (): Promise<Invite[]> => {
      if (!serverId) return [];

      const { data, error } = await supabase
        .from('invites')
        .select(`
          *,
          creator:created_by(display_name, avatar_url)
        `)
        .eq('server_id', serverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((inv: any) => ({
        ...inv,
        creator: inv.creator || undefined,
      }));
    },
    enabled: !!serverId && !!user,
  });

  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:invites:${serverId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
}

export function useCreateInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      expiresIn,
      maxUses,
      isPermanent,
    }: {
      serverId: string;
      expiresIn?: number; // hours
      maxUses?: number;
      isPermanent?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('invites')
        .insert({
          server_id: serverId,
          created_by: user.id,
          expires_at: isPermanent ? null : expiresAt,
          max_uses: maxUses || null,
          is_permanent: isPermanent || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ serverId, isPermanent, expiresIn, maxUses }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['invites', serverId] });
      const previousInvites = queryClient.getQueryData(['invites', serverId]);
      
      const tempInvite: Invite = {
        id: `temp-${Date.now()}`,
        server_id: serverId,
        code: 'loading...',
        created_by: user.id,
        expires_at: isPermanent ? null : (expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString() : null),
        max_uses: maxUses || null,
        uses: 0,
        is_permanent: isPermanent || false,
        created_at: new Date().toISOString(),
        creator: {
          display_name: user.user_metadata?.display_name || 'Vous',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };
      
      queryClient.setQueryData(['invites', serverId], (old: Invite[] | undefined) =>
        old ? [tempInvite, ...old] : [tempInvite]
      );
      
      return { previousInvites };
    },
    onError: (_, variables, context) => {
      if (context?.previousInvites) {
        queryClient.setQueryData(['invites', variables.serverId], context.previousInvites);
      }
      toast.error('Erreur lors de la création de l\'invitation');
    },
    onSuccess: () => {
      toast.success('Invitation créée !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
    },
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, serverId }: { inviteId: string; serverId: string }) => {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      return { serverId };
    },
    onMutate: async ({ inviteId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['invites', serverId] });
      const previousInvites = queryClient.getQueryData(['invites', serverId]);
      
      queryClient.setQueryData(['invites', serverId], (old: Invite[] | undefined) =>
        old?.filter(i => i.id !== inviteId)
      );
      
      return { previousInvites };
    },
    onError: (_, variables, context) => {
      if (context?.previousInvites) {
        queryClient.setQueryData(['invites', variables.serverId], context.previousInvites);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Invitation supprimée');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
    },
  });
}

export function useJoinByInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data, error } = await supabase.rpc('use_invite', {
        invite_code: inviteCode,
      });

      if (error) throw error;
      return data as string; // server_id
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);
      
      return { previousServers };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      if (error.message.includes('expired')) {
        toast.error('Cette invitation a expiré');
      } else if (error.message.includes('maximum')) {
        toast.error('Cette invitation a atteint le nombre maximum d\'utilisations');
      } else {
        toast.error('Invitation invalide');
      }
    },
    onSuccess: () => {
      toast.success('Vous avez rejoint le serveur !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}
