import { useEffect } from 'react';

/**
 * Tiny module-level pub/sub to request a role filter to be applied
 * in the active MemberList. Used by RoleInfoPopup ("Filtrer par ce rôle").
 *
 * The active filter is also mirrored in sessionStorage (per server) so it
 * survives a refresh while the tab is open — keeping the UI instantly
 * consistent with the user's last action.
 */
type Listener = (roleId: string) => void;
const listeners = new Set<Listener>();

const STORAGE_PREFIX = 'member-role-filter:';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function getPersistedRoleFilter(serverId: string | null | undefined): string[] {
  if (!serverId || !canUseStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${serverId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function setPersistedRoleFilter(serverId: string | null | undefined, roleIds: string[]): void {
  if (!serverId || !canUseStorage()) return;
  try {
    if (roleIds.length === 0) {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${serverId}`);
    } else {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${serverId}`, JSON.stringify(roleIds));
    }
  } catch {
    // ignore quota / serialization errors
  }
}

export function requestMemberRoleFilter(roleId: string) {
  listeners.forEach((l) => l(roleId));
}

export function useMemberRoleFilterListener(cb: Listener) {
  useEffect(() => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, [cb]);
}
