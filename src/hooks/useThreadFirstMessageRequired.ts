import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* Option de salon "Premier message obligatoire" pour les fils (colonne channels.thread_first_message_required). */
const sb = supabase as unknown as { from: (t: string) => any };

export function useThreadFirstMessageRequired(channelId: string | null | undefined) {
  return useQuery({
    queryKey: ['thread-first-message-required', channelId],
    enabled: !!channelId,
    staleTime: 30_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await sb.from('channels').select('thread_first_message_required').eq('id', channelId).maybeSingle();
      if (error) return false;
      return !!data?.thread_first_message_required;
    },
  });
}

export function useSetThreadFirstMessageRequired(channelId: string) {
  const qc = useQueryClient();
  const key = ['thread-first-message-required', channelId];
  return useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await sb.from('channels').update({ thread_first_message_required: value }).eq('id', channelId);
      if (error) throw error;
    },
    onMutate: (value) => {
      const prev = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, value);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev ?? false);
      toast.error("Impossible de modifier l'option");
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}
