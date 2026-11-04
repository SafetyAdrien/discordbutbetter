import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCreateInvite } from '@/hooks/useInvites';
import { useCreateDMConversation, useDMConversations } from '@/hooks/useDMs';
import { useSendDMMessage } from '@/hooks/useDMMessages';

/* "Inviter sur le serveur" : cree une invitation permanente puis l'envoie en message prive a la personne. */
export function useInviteUserToServer() {
  const createInvite = useCreateInvite();
  const { data: conversations = [] } = useDMConversations();
  const createDM = useCreateDMConversation();
  const send = useSendDMMessage();

  return useCallback(
    async (userId: string, serverId: string, serverName: string) => {
      try {
        const invite = await createInvite.mutateAsync({ serverId, isPermanent: true });
        const existing = conversations.find((c) => !c.is_group && c.participants.some((p) => p.id === userId));
        const conversationId = existing?.id ?? (await createDM.mutateAsync(userId)).conversation_id;
        await send.mutateAsync({ conversationId, content: `${window.location.origin}/invite/${invite.code}` });
        toast.success(`Invitation à ${serverName} envoyée`);
      } catch {
        toast.error("Impossible d'envoyer l'invitation");
      }
    },
    [createInvite, conversations, createDM, send],
  );
}
