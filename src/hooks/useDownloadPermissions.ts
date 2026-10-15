import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DownloadPermissionRow {
  id: string;
  owner_id: string;
  allowed_user_id: string;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const LIST_KEY = (uid: string | undefined) => ['download-permissions', uid ?? 'anon'] as const;
const CAN_KEY = (ownerId: string, viewerId: string | undefined) =>
  ['can-download', ownerId, viewerId ?? 'anon'] as const;

/** List the people the current user has allowed to download their content. */
export function useDownloadPermissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const query = useQuery({
    queryKey: LIST_KEY(uid),
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<DownloadPermissionRow[]> => {
      const { data, error } = await supabase
        .from('download_permissions')
        .select(`
          id,
          owner_id,
          allowed_user_id,
          created_at,
          profile:profiles!download_permissions_allowed_user_id_fkey (
            id, username, display_name, avatar_url
          )
        `)
        .eq('owner_id', uid!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Realtime: keep the list in sync across tabs/devices.
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`dl-perms-owner:${uid}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'download_permissions',
          filter: `owner_id=eq.${uid}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: LIST_KEY(uid) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);

  return query;
}

/**
 * Realtime listener for the person being granted/revoked download rights.
 * Invalidates can-download caches so the download button appears/disappears
 * immediately on the recipient's side, without a refresh.
 *
 * Mount once near the app root.
 */
export function useDownloadPermissionsRecipientRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`dl-perms-allowed:${uid}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'download_permissions',
          filter: `allowed_user_id=eq.${uid}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { owner_id?: string } | undefined;
          if (!row?.owner_id) {
            queryClient.invalidateQueries({ queryKey: ['can-download'] });
            return;
          }
          queryClient.invalidateQueries({ queryKey: CAN_KEY(row.owner_id, uid) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);
}

export function useAddDownloadPermission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allowedUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('download_permissions')
        .insert({ owner_id: user.id, allowed_user_id: allowedUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY(user?.id) });
    },
    onError: (err: any) => {
      const msg = err?.message?.includes('duplicate')
        ? 'Cette personne est déjà autorisée.'
        : err?.message || 'Impossible d\'ajouter cette personne';
      toast.error(msg);
    },
  });
}

export function useRemoveDownloadPermission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rowId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('download_permissions')
        .delete()
        .eq('id', rowId)
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY(user?.id) });
    },
    onError: (err: any) => toast.error(err?.message || 'Suppression impossible'),
  });
}

/**
 * Returns whether the current viewer is allowed to download `ownerId`'s content,
 * plus the loading state of the underlying permission check.
 * Owner is always allowed on their own content (canDownload=true, isLoading=false).
 */
export function useCanDownload(ownerId: string | null | undefined): { canDownload: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const viewerId = user?.id;

  const enabled = !!ownerId && !!viewerId && ownerId !== viewerId;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: CAN_KEY(ownerId ?? '_', viewerId),
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('can_download_user_content', {
        _owner_id: ownerId!,
        _viewer_id: viewerId!,
      });
      if (error) {
        console.error('[useCanDownload] rpc error', error);
        return false;
      }
      return Boolean(data);
    },
  });

  if (!ownerId) return { canDownload: false, isLoading: false };
  if (viewerId && ownerId === viewerId) return { canDownload: true, isLoading: false };
  return {
    canDownload: Boolean(data),
    isLoading: enabled && (isLoading || (data === undefined && isFetching)),
  };
}

/**
 * Props to attach to an <img> (or any element wrapping a CSS background-image)
 * belonging to another user. Blocks "Save image as..." (right-click) and
 * drag-and-drop saving when the viewer is not authorized. Fail-safe: blocks
 * while the permission check is in flight.
 */
export function useImageGuardProps(ownerId: string | null | undefined) {
  const { canDownload, isLoading } = useCanDownload(ownerId);
  const blocked = !canDownload || isLoading;
  return {
    onContextMenu: blocked
      ? (e: { preventDefault: () => void }) => {
          e.preventDefault();
        }
      : undefined,
    draggable: blocked ? false : undefined,
  } as const;
}

export interface DownloadableCandidate {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useSearchDownloadableCandidates(query: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['download-candidates', user?.id, query],
    enabled: !!user,
    staleTime: 10_000,
    queryFn: async (): Promise<DownloadableCandidate[]> => {
      const { data, error } = await supabase.rpc('search_downloadable_candidates', {
        _query: query,
      });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}
