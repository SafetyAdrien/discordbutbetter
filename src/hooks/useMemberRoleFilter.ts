import { useEffect } from 'react';

/**
 * Tiny module-level pub/sub to request a role filter to be applied
 * in the active MemberList. Used by RoleInfoPopup ("Filtrer par ce rôle").
 */
type Listener = (roleId: string) => void;
const listeners = new Set<Listener>();

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
