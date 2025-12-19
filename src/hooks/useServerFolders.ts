import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ServerFolder, ServerFolderDB } from '@/types/serverFolder';

const mapDBToFolder = (db: ServerFolderDB): ServerFolder => ({
  id: db.id,
  userId: db.user_id,
  name: db.name,
  color: db.color,
  isExpanded: db.is_expanded,
  position: db.position,
  serverIds: db.server_ids || [],
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export function useServerFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['server-folders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('server_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDBToFolder);
    },
    enabled: !!user?.id,
  });

  // Create a new folder
  const createFolder = useMutation({
    mutationFn: async ({
      serverIds,
      name = 'Dossier',
      color = '#5865f2',
      position = 0,
    }: {
      serverIds: string[];
      name?: string;
      color?: string;
      position?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('server_folders')
        .insert({
          user_id: user.id,
          name,
          color,
          server_ids: serverIds,
          position,
          is_expanded: true,
        })
        .select()
        .single();

      if (error) throw error;
      return mapDBToFolder(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-folders', user?.id] });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le dossier',
        variant: 'destructive',
      });
    },
  });

  // Update a folder
  const updateFolder = useMutation({
    mutationFn: async ({
      folderId,
      updates,
    }: {
      folderId: string;
      updates: Partial<{
        name: string;
        color: string;
        is_expanded: boolean;
        server_ids: string[];
        position: number;
      }>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('server_folders')
        .update(updates)
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ folderId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['server-folders', user?.id] });
      const previousFolders = queryClient.getQueryData<ServerFolder[]>(['server-folders', user?.id]);

      queryClient.setQueryData<ServerFolder[]>(['server-folders', user?.id], (old) =>
        old?.map((f) =>
          f.id === folderId
            ? {
                ...f,
                ...(updates.name !== undefined && { name: updates.name }),
                ...(updates.color !== undefined && { color: updates.color }),
                ...(updates.is_expanded !== undefined && { isExpanded: updates.is_expanded }),
                ...(updates.server_ids !== undefined && { serverIds: updates.server_ids }),
                ...(updates.position !== undefined && { position: updates.position }),
              }
            : f
        )
      );

      return { previousFolders };
    },
    onError: (err, _, context) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(['server-folders', user?.id], context.previousFolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['server-folders', user?.id] });
    },
  });

  // Delete a folder (servers are released)
  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('server_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-folders', user?.id] });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le dossier',
        variant: 'destructive',
      });
    },
  });

  // Add server to folder
  const addServerToFolder = (folderId: string, serverId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    if (folder.serverIds.includes(serverId)) return;

    updateFolder.mutate({
      folderId,
      updates: { server_ids: [...folder.serverIds, serverId] },
    });
  };

  // Remove server from folder
  const removeServerFromFolder = (folderId: string, serverId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    const newServerIds = folder.serverIds.filter((id) => id !== serverId);

    // Auto-dissolve folder if only 1 or 0 servers left
    if (newServerIds.length <= 1) {
      deleteFolder.mutate(folderId);
    } else {
      updateFolder.mutate({
        folderId,
        updates: { server_ids: newServerIds },
      });
    }
  };

  // Toggle folder expanded/collapsed
  const toggleFolderExpanded = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    updateFolder.mutate({
      folderId,
      updates: { is_expanded: !folder.isExpanded },
    });
  };

  // Get folder containing a server
  const getFolderForServer = (serverId: string): ServerFolder | null => {
    return folders.find((f) => f.serverIds.includes(serverId)) || null;
  };

  // Get all server IDs that are in folders
  const getServerIdsInFolders = (): Set<string> => {
    const ids = new Set<string>();
    folders.forEach((f) => f.serverIds.forEach((id) => ids.add(id)));
    return ids;
  };

  return {
    folders,
    isLoading,
    createFolder,
    updateFolder,
    deleteFolder,
    addServerToFolder,
    removeServerFromFolder,
    toggleFolderExpanded,
    getFolderForServer,
    getServerIdsInFolders,
  };
}
