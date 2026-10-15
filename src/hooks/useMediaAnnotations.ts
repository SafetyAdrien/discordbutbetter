import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Annotation {
  id: string;
  post_id: string;
  item_id: string;
  user_id: string;
  tool: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  created_at: string;
}

export function useMediaAnnotations(itemId: string | null) {
  const queryClient = useQueryClient();
  const key = ['media-annotations', itemId];
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!itemId) return;
    const channel = supabase
      .channel(`media-annot-${itemId}-${instanceIdRef.current}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'media_post_annotations', filter: `item_id=eq.${itemId}` },
        () => { queryClient.invalidateQueries({ queryKey: key }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [itemId]);

  return useQuery({
    queryKey: key,
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('media_post_annotations') as any)
        .select('*')
        .eq('item_id', itemId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Annotation[];
    },
  });
}

export function useCreateAnnotation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (a: Omit<Annotation, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('media_post_annotations') as any)
        .insert({ ...a, user_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      return data as Annotation;
    },
    onSuccess: (anno) => {
      queryClient.setQueryData(['media-annotations', anno.item_id], (old: Annotation[] = []) => [...old, anno]);
    },
  });
}

export function useClearMyAnnotations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase.from('media_post_annotations') as any)
        .delete()
        .eq('item_id', itemId)
        .eq('user_id', user.id);
      if (error) throw error;
      return itemId;
    },
    onSuccess: (itemId) => {
      queryClient.setQueryData(['media-annotations', itemId], (old: Annotation[] = []) =>
        old.filter((a) => a.user_id !== user?.id)
      );
    },
  });
}
