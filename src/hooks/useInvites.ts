import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useServerInvites(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invites', serverId],
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
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
      toast.success('Invitation créée !');
    },
    onError: () => {
      toast.error('Erreur lors de la création de l\'invitation');
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
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
      toast.success('Invitation supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Vous avez rejoint le serveur !');
    },
    onError: (error: Error) => {
      if (error.message.includes('expired')) {
        toast.error('Cette invitation a expiré');
      } else if (error.message.includes('maximum')) {
        toast.error('Cette invitation a atteint le nombre maximum d\'utilisations');
      } else {
        toast.error('Invitation invalide');
      }
    },
  });
}
