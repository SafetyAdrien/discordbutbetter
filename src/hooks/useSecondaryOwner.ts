import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  banner_url: string | null;
  description: string | null;
  owner_id: string | null;
  secondary_owner_id: string | null;
  is_public: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Conflict-resolution strategy for secondary-owner changes:
 *
 * 1. Per-server serialization — concurrent mutations on the SAME server from the same
 *    client are queued (chained) so we never fire overlapping RPCs that race each other.
 * 2. Each mutation carries a monotonic `intent` sequence (lamport-ish). Only the latest
 *    intent for a server is considered authoritative locally.
 * 3. Realtime UPDATE on `servers` is the source of truth: when it arrives it overwrites
 *    the optimistic value (see useServers). DB enforces last-write-wins across clients.
 * 4. If the local latest intent disagrees with the realtime payload, we accept the
 *    server value (already patched by useServers) and notify the user that another
 *    admin changed it concurrently.
 */
const inflightByServer = new Map<string, Promise<unknown>>();
const latestIntentByServer = new Map<string, { seq: number; targetUserId: string | null }>();
let intentCounter = 0;

function enqueue<T>(serverId: string, task: () => Promise<T>): Promise<T> {
  const prev = inflightByServer.get(serverId) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(task);
  inflightByServer.set(
    serverId,
    next.finally(() => {
      if (inflightByServer.get(serverId) === next) inflightByServer.delete(serverId);
    })
  );
  return next;
}

function recordIntent(serverId: string, targetUserId: string | null) {
  const seq = ++intentCounter;
  latestIntentByServer.set(serverId, { seq, targetUserId });
  return seq;
}

function isLatestIntent(serverId: string, seq: number) {
  return latestIntentByServer.get(serverId)?.seq === seq;
}

export function useSetSecondaryOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, userId }: { serverId: string; userId: string }) => {
      const seq = recordIntent(serverId, userId);
      // Fire-and-forget but serialized per server to avoid client-side races.
      enqueue(serverId, async () => {
        const { error } = await supabase.rpc('set_secondary_owner', {
          _server_id: serverId,
          _user_id: userId,
        });
        if (error) {
          console.error('set_secondary_owner failed', error);
          // Only revert if this was still the user's latest intent.
          if (isLatestIntent(serverId, seq)) {
            toast.error("Impossible d'ajouter le second propriétaire");
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            queryClient.invalidateQueries({ queryKey: ['members'] });
          }
        }
      });
      return { serverId, userId };
    },
    onMutate: async ({ serverId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);

      queryClient.setQueryData<Server[]>(['servers'], old =>
        old?.map(s => s.id === serverId ? { ...s, secondary_owner_id: userId } : s)
      );

      toast.success('Second propriétaire ajouté');
      return { previousServers };
    },
  });
}

export function useRemoveSecondaryOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const seq = recordIntent(serverId, null);
      enqueue(serverId, async () => {
        const { error } = await supabase.rpc('remove_secondary_owner', { _server_id: serverId });
        if (error) {
          console.error('remove_secondary_owner failed', error);
          if (isLatestIntent(serverId, seq)) {
            toast.error('Impossible de retirer le second propriétaire');
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            queryClient.invalidateQueries({ queryKey: ['members'] });
          }
        }
      });
      return serverId;
    },
    onMutate: async (serverId) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);

      queryClient.setQueryData<Server[]>(['servers'], old =>
        old?.map(s => s.id === serverId ? { ...s, secondary_owner_id: null } : s)
      );

      toast.success('Second propriétaire retiré');
      return { previousServers };
    },
  });
}

/**
 * Exposed for the realtime layer (useServers) so it can detect when a remote change
 * conflicts with our latest local intent and notify the user.
 */
export function reconcileSecondaryOwnerFromRealtime(serverId: string, remoteValue: string | null) {
  const intent = latestIntentByServer.get(serverId);
  if (!intent) return;
  if (intent.targetUserId !== remoteValue) {
    toast.info('Un autre administrateur a modifié le second propriétaire');
    latestIntentByServer.delete(serverId);
  } else {
    // Server agrees with our intent — clear it.
    latestIntentByServer.delete(serverId);
  }
}


export function useTransferOwnership() {

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, newOwnerId }: { serverId: string; newOwnerId: string }) => {
      const { error } = await supabase.rpc('transfer_server_ownership', {
        _server_id: serverId,
        _new_owner_id: newOwnerId
      });
      if (error) throw error;
      return { serverId, newOwnerId };
    },
    onMutate: async ({ serverId, newOwnerId }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);
      
      queryClient.setQueryData<Server[]>(['servers'], old =>
        old?.map(s => s.id === serverId ? { ...s, owner_id: newOwnerId, secondary_owner_id: null } : s)
      );
      
      return { previousServers };
    },
    onError: (_, __, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Impossible de transférer la propriété');
    },
    onSuccess: () => {
      toast.success('Propriété transférée avec succès');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
}
