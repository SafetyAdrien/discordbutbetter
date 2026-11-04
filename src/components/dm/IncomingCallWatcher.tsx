import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAllDMCalls } from '@/hooks/useDMCalls';
import { useRingtone } from '@/hooks/useRingtone';
import { useRelations } from '@/hooks/useRelations';
import { dismissRing, joinCallSession, useDMCallSession } from '@/lib/dmCallSession';
import { OPEN_SERVER_EVENT } from '@/lib/invites';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { Phone, X } from '@/components/icons/discord/lucide';

/*
 * Appel entrant hors de la conversation : sonnerie et carte "Appel entrant" (avatar, nom, repondre / refuser) tant que
 * l'appel sonne et que le MP correspondant n'est pas ouvert (ouvert, la scene d'appel du MP prend le relais).
 */
export function IncomingCallWatcher({ activeConversationId }: { activeConversationId: string | null }) {
  const { user } = useAuth();
  const calls = useAllDMCalls();
  const session = useDMCallSession();
  const queryClient = useQueryClient();
  const { nameFor } = useRelations();

  const incoming = useMemo(
    () => calls.find((c) => c.status === 'ringing' && c.initiator_id !== user?.id && c.conversation_id !== activeConversationId && !session.dismissed.includes(c.id)),
    [calls, user?.id, activeConversationId, session.dismissed],
  );
  useRingtone(!!incoming);
  if (!incoming) return null;

  const name = nameFor(incoming.initiator?.id ?? incoming.initiator_id, incoming.initiator?.display_name ?? 'Utilisateur');
  const accept = async () => {
    const { error } = await supabase.from('dm_calls').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', incoming.id);
    if (error) return;
    joinCallSession(incoming.id, incoming.conversation_id, name);
    void queryClient.invalidateQueries({ queryKey: ['dm-calls-all'] });
    window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId: null, conversationId: incoming.conversation_id } }));
  };

  return (
    <div role="alert" className="fixed bottom-[88px] left-[84px] z-[150] flex w-[300px] items-center gap-3 rounded-lg border border-white/[0.08] bg-[#2b2b33] p-3 shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
      <UserAvatarImage src={incoming.initiator?.avatar_url} alt="" className="h-10 w-10" fallbackClassName="text-base" fallback={name.charAt(0).toUpperCase()} ownerId={incoming.initiator_id} />
      <div className="min-w-0 flex-1">
        <p translate="no" className="truncate text-base font-semibold leading-5 text-white">{name}</p>
        <p className="text-sm leading-[18px] text-[#b5bac1]">Appel entrant…</p>
      </div>
      <button type="button" aria-label="Répondre" onClick={() => void accept()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#248046] text-white transition-colors hover:bg-[#1a6334]"><Phone className="h-5 w-5" /></button>
      <button type="button" aria-label="Refuser" onClick={() => dismissRing(incoming.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#da373c] text-white transition-colors hover:bg-[#a12d2f]"><X className="h-5 w-5" /></button>
    </div>
  );
}
