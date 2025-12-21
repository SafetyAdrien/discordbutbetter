import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useRef } from 'react';

interface UserNote {
  id: string;
  user_id: string;
  target_user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useUserNote(targetUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-note', targetUserId],
    enabled: !!user && !!targetUserId,
    queryFn: async () => {
      if (!user || !targetUserId) return null;

      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      return data as UserNote | null;
    },
  });
}

export function useSaveUserNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ targetUserId, content }: { targetUserId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_notes')
        .upsert(
          {
            user_id: user.id,
            target_user_id: targetUserId,
            content,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,target_user_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-note', variables.targetUserId] });
    },
  });

  const saveWithDebounce = useCallback(
    (targetUserId: string, content: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        mutation.mutate({ targetUserId, content });
      }, 500);
    },
    [mutation]
  );

  return {
    ...mutation,
    saveWithDebounce,
  };
}
