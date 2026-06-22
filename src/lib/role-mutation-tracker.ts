/**
 * Tracks in-flight role mutations to prevent stale Realtime / refetch payloads
 * from overwriting the optimistic UI state ("flicker/jump" on click).
 *
 * Key format: `${serverId}:${memberId}:${roleId}` → target state ('add' | 'remove').
 */

export type RoleMutationTarget = "add" | "remove";

const pending = new Map<string, RoleMutationTarget>();

function key(serverId: string, memberId: string, roleId: string) {
  return `${serverId}:${memberId}:${roleId}`;
}

export function setRoleMutationPending(
  serverId: string,
  memberId: string,
  roleId: string,
  target: RoleMutationTarget,
) {
  pending.set(key(serverId, memberId, roleId), target);
}

export function clearRoleMutationPending(
  serverId: string,
  memberId: string,
  roleId: string,
) {
  pending.delete(key(serverId, memberId, roleId));
}

export function getRoleMutationTarget(
  serverId: string,
  memberId: string,
  roleId: string,
): RoleMutationTarget | undefined {
  return pending.get(key(serverId, memberId, roleId));
}
