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

export function isRoleMutationPending(
  serverId: string,
  memberId: string,
  roleId: string,
): boolean {
  return pending.has(key(serverId, memberId, roleId));
}

export function getRoleMutationTarget(
  serverId: string,
  memberId: string,
  roleId: string,
): RoleMutationTarget | undefined {
  return pending.get(key(serverId, memberId, roleId));
}

/** Returns all pending mutations for a given member in a server. */
export function getPendingForMember(
  serverId: string,
  memberId: string,
): Array<{ roleId: string; target: RoleMutationTarget }> {
  const prefix = `${serverId}:${memberId}:`;
  const out: Array<{ roleId: string; target: RoleMutationTarget }> = [];
  for (const [k, v] of pending) {
    if (k.startsWith(prefix)) {
      out.push({ roleId: k.slice(prefix.length), target: v });
    }
  }
  return out;
}

/** Returns all pending mutations for a server (any member). */
export function getPendingForServer(
  serverId: string,
): Array<{ memberId: string; roleId: string; target: RoleMutationTarget }> {
  const prefix = `${serverId}:`;
  const out: Array<{ memberId: string; roleId: string; target: RoleMutationTarget }> = [];
  for (const [k, v] of pending) {
    if (!k.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length);
    const idx = rest.indexOf(":");
    if (idx < 0) continue;
    out.push({ memberId: rest.slice(0, idx), roleId: rest.slice(idx + 1), target: v });
  }
  return out;
}
