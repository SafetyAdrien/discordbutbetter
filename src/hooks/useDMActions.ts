import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDMConversation, useDMConversations } from '@/hooks/useDMs';
import { OPEN_SERVER_EVENT } from '@/lib/invites';

/* Ouvrir le MP d'un utilisateur (le cree au besoin) et y lancer un appel, depuis les menus (membres, profils...). */
export function useDMActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: conversations = [] } = useDMConversations();
  const createDM = useCreateDMConversation();

  const openDM = useCallback(
    async (userId: string): Promise<string | null> => {
      try {
        const existing = conversations.find((c) => !c.is_group && c.participants.some((p) => p.id === userId));
        const id = existing?.id ?? (await createDM.mutateAsync(userId)).conversation_id;
        window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId: null, conversationId: id } }));
        return id;
      } catch {
        toast.error('Impossible de créer la conversation');
        return null;
      }
    },
    [conversations, createDM],
  );

  const startCall = useCallback(
    async (userId: string, callType: 'voice' | 'video' = 'voice') => {
      if (!user) return;
      const id = await openDM(userId);
      if (!id) return;
      const { error } = await supabase.from('dm_calls').insert({ conversation_id: id, initiator_id: user.id, call_type: callType, status: 'ringing' });
      if (error) toast.error("Impossible de lancer l'appel");
      else void queryClient.invalidateQueries({ queryKey: ['dm-call', id] });
    },
    [user, openDM, queryClient],
  );

  return { openDM, startCall };
}
