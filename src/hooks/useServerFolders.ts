import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/*
 * Dossiers de serveurs (rail de gauche). Chaque dossier appartient a
 * l'utilisateur : nom facultatif, couleur facultative (bleu Discord par
 * defaut), liste ordonnee de serveurs et position parmi les entrees du rail
 * (serveurs libres + dossiers). L'etat ouvert/ferme est conserve avec le
 * dossier.
 */

export const DEFAULT_FOLDER_COLOR = '#5865f2';

export interface ServerFolder {
  id: string;
  name: string | null;
  color: string | null;
  serverIds: string[];
  position: number;
  expanded: boolean;
}

export type FolderPatch = Partial<Pick<ServerFolder, 'name' | 'color' | 'serverIds' | 'position' | 'expanded'>>;

type Row = {
  id: string;
  name: string | null;
  color: string | null;
  server_ids: string[] | null;
  position: number;
  is_expanded: boolean | null;
};

const toFolder = (r: Row): ServerFolder => ({
  id: r.id,
  name: r.name,
  color: r.color,
  serverIds: r.server_ids ?? [],
  position: r.position,
  expanded: !!r.is_expanded,
});

const toRow = (p: FolderPatch) => ({
  ...(p.name !== undefined && { name: p.name }),
  ...(p.color !== undefined && { color: p.color }),
  ...(p.serverIds !== undefined && { server_ids: p.serverIds }),
  ...(p.position !== undefined && { position: p.position }),
  ...(p.expanded !== undefined && { is_expanded: p.expanded }),
  updated_at: new Date().toISOString(),
});

export function useServerFolders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = useMemo(() => ['server-folders', user?.id], [user?.id]);

  const { data: folders = [] } = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('server_folders')
        .select('id,name,color,server_ids,position,is_expanded')
        .eq('user_id', user!.id)
        .order('position', { ascending: true });
      if (error) return [] as ServerFolder[];
      return (data as Row[]).map(toFolder);
    },
  });

  const patchCache = useCallback(
    (fn: (prev: ServerFolder[]) => ServerFolder[]) => qc.setQueryData<ServerFolder[]>(key, (prev) => fn(prev ?? [])),
    [qc, key],
  );

  const onError = () => {
    toast.error('Erreur lors de la sauvegarde', { description: 'Les dossiers de serveurs n\'ont pas pu être enregistrés' });
    void qc.invalidateQueries({ queryKey: key });
  };

  const create = useMutation({
    mutationFn: async (input: { serverIds: string[]; position: number; expanded?: boolean }) => {
      const { data, error } = await supabase
        .from('server_folders')
        .insert({ user_id: user!.id, server_ids: input.serverIds, position: input.position, is_expanded: input.expanded ?? false })
        .select('id,name,color,server_ids,position,is_expanded')
        .single();
      if (error) throw error;
      return toFolder(data as Row);
    },
    onSuccess: (f) => patchCache((prev) => [...prev, f]),
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: FolderPatch }) => {
      const { error } = await supabase.from('server_folders').update(toRow(patch)).eq('id', id);
      if (error) throw error;
    },
    onMutate: ({ id, patch }) => patchCache((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f))),
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('server_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => patchCache((prev) => prev.filter((f) => f.id !== id)),
    onError,
  });

  /** Ecrit en une passe plusieurs dossiers (positions apres un deplacement). */
  const updateMany = useCallback(
    (patches: { id: string; patch: FolderPatch }[]) => {
      if (!patches.length) return;
      patchCache((prev) => prev.map((f) => ({ ...f, ...(patches.find((p) => p.id === f.id)?.patch ?? {}) })));
      void Promise.all(patches.map(({ id, patch }) => supabase.from('server_folders').update(toRow(patch)).eq('id', id))).then(
        (res) => res.some((r) => r.error) && onError(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patchCache],
  );

  return {
    folders,
    createFolder: create.mutateAsync,
    updateFolder: (id: string, patch: FolderPatch) => update.mutate({ id, patch }),
    deleteFolder: (id: string) => remove.mutate(id),
    updateFolders: updateMany,
  };
}
