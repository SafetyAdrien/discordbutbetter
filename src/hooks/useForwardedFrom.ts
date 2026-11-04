import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isForwardedFrom, type ForwardedFrom, type ForwardKind } from '@/lib/forwardMessage';

const TABLE: Record<ForwardKind, string> = { channel: 'messages', thread: 'thread_messages', dm: 'dm_messages' };
const EMPTY = new Map<string, ForwardedFrom>();

/*
 * Origine des messages transferes d'une liste. Requete a part (une seule, filtree sur les lignes qui ont
 * `forwarded_from`) : un transfert ne ralentit pas le chargement normal des messages, et la colonne
 * absente (migration pas encore appliquee) donne simplement "aucun message transfere".
 */
export function useForwardedFrom(kind: ForwardKind, scopeId: string | null | undefined, messageIds: string[]) {
  const last = messageIds[messageIds.length - 1] ?? '';
  const { data } = useQuery({
    queryKey: ['forwarded-from', kind, scopeId, messageIds.length, last],
    enabled: !!scopeId && messageIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, ForwardedFrom>> => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from(TABLE[kind])
        .select('id, forwarded_from')
        .in('id', messageIds.filter((id) => !id.startsWith('temp-')).slice(-200))
        .not('forwarded_from', 'is', null);
      if (error || !Array.isArray(data)) return EMPTY;
      return new Map((data as { id: string; forwarded_from: unknown }[]).filter((r) => isForwardedFrom(r.forwarded_from)).map((r) => [r.id, r.forwarded_from as ForwardedFrom]));
    },
  });
  return data ?? EMPTY;
}
