import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface ServerNotification {
  id: string;
  server_id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string;
  message: string;
  status: 'pending' | 'read' | 'accepted' | 'rejected';
  created_at: string;
  responded_at: string | null;
  server?: {
    name: string;
    icon_url: string | null;
  };
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<ServerNotification[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('server_notifications')
        .select(`
          *,
          server:servers!server_notifications_server_id_fkey (
            name,
            icon_url
          ),
          sender:profiles!server_notifications_sender_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ServerNotification[];
    },
    enabled: !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'server_notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useUnreadNotificationsCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter(n => n.status === 'pending').length;
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('server_notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (old: ServerNotification[] | undefined) =>
        old?.map(n => n.id === notificationId ? { ...n, status: 'read' as const } : n)
      );
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('server_notifications')
        .update({ status: 'read' })
        .eq('recipient_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (old: ServerNotification[] | undefined) =>
        old?.map(n => n.status === 'pending' ? { ...n, status: 'read' as const } : n)
      );
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
      toast.error('Erreur lors du marquage');
    },
    onSuccess: () => {
      toast.success('Toutes les notifications marquées comme lues');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('server_notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (old: ServerNotification[] | undefined) =>
        old?.filter(n => n.id !== notificationId)
      );
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRespondToDeletionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, accept }: { notificationId: string; accept: boolean }) => {
      const { data, error } = await supabase.rpc('respond_to_deletion_request', {
        _notification_id: notificationId,
        _accept: accept,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { accept }) => {
      toast.success(accept ? 'Demande acceptée - Serveur supprimé' : 'Demande refusée');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
    onError: () => {
      toast.error('Erreur lors de la réponse');
    },
  });
}
