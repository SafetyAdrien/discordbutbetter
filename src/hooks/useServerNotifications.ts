import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServerNotification {
  id: string;
  server_id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'read';
  created_at: string;
  responded_at: string | null;
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
  server?: {
    name: string;
    icon_url: string | null;
  };
}

export function useServerNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['server-notifications', user?.id],
    queryFn: async (): Promise<ServerNotification[]> => {
      const { data, error } = await supabase
        .from('server_notifications')
        .select(`
          *,
          sender:profiles!server_notifications_sender_id_fkey(display_name, avatar_url),
          server:servers!server_notifications_server_id_fkey(name, icon_url)
        `)
        .eq('recipient_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ServerNotification[];
    },
    enabled: !!user,
  });
}

export function useRespondToNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, accept }: { notificationId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_to_deletion_request', {
        _notification_id: notificationId,
        _accept: accept
      });
      if (error) throw error;
      return { notificationId, accept };
    },
    onMutate: async ({ notificationId, accept }) => {
      await queryClient.cancelQueries({ queryKey: ['server-notifications'] });
      const previousNotifications = queryClient.getQueryData(['server-notifications']);
      
      queryClient.setQueryData(['server-notifications'], (old: ServerNotification[] | undefined) =>
        old?.map(n => n.id === notificationId 
          ? { ...n, status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() }
          : n
        )
      );
      
      return { previousNotifications };
    },
    onError: (_, __, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['server-notifications'], context.previousNotifications);
      }
      toast.error('Erreur lors de la réponse');
    },
    onSuccess: (data) => {
      if (data.accept) {
        toast.success('Demande acceptée - Serveur supprimé');
        queryClient.invalidateQueries({ queryKey: ['servers'] });
      } else {
        toast.success('Demande refusée');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['server-notifications'] });
    }
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('server_notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);
      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-notifications'] });
    }
  });
}
