import { useAuth } from '@/contexts/AuthContext';
import { useServers } from '@/hooks/useServers';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
import { useServerRoles, RoleWithPermissions, ServerPermission } from '@/hooks/useRoles';
import { useMemo } from 'react';

interface PermissionContext {
  isOwner: boolean;
  isSecondaryOwner: boolean;
  isGod: boolean; // Owner OR Secondary Owner - full access
  hasPermission: (permission: ServerPermission) => boolean;
  canManageRole: (rolePosition: number | null) => boolean;
  canAssignRole: (roleId: string) => boolean;
  canDragRole: (rolePosition: number | null) => boolean;
  userHighestRolePosition: number;
  currentMember: MemberWithProfile | null;
  roles: RoleWithPermissions[];
}

export function usePermissions(serverId: string | null): PermissionContext {
  const { user } = useAuth();
  const { data: servers = [] } = useServers();
  const { data: members = [] } = useMembers(serverId);
  const { data: roles = [] } = useServerRoles(serverId);

  const server = servers.find(s => s.id === serverId);
  const currentMember = members.find(m => m.user.id === user?.id) || null;

  // Check if user is owner or secondary owner (GOD mode)
  const isOwner = server?.owner_id === user?.id;
  const isSecondaryOwner = server?.secondary_owner_id === user?.id;
  const isGod = isOwner || isSecondaryOwner;

  // Get user's highest role position
  const userHighestRolePosition = useMemo(() => {
    if (!currentMember?.roles) return 0;
    return currentMember.roles.reduce((max, role) => {
      const roleData = roles.find(r => r.id === role.id);
      return roleData ? Math.max(max, roleData.position ?? 0) : max;
    }, 0);
  }, [currentMember, roles]);

  // Check if user has administrator permission
  const hasAdminPermission = useMemo(() => {
    if (isGod) return true;
    if (!currentMember?.roles) return false;
    return currentMember.roles.some(r => {
      const roleData = roles.find(rd => rd.id === r.id);
      return roleData?.permissions?.includes('administrator');
    });
  }, [currentMember, roles, isGod]);

  // Check if user has a specific permission
  const hasPermission = (permission: ServerPermission): boolean => {
    if (isGod) return true;
    if (hasAdminPermission) return true;
    if (!currentMember?.roles) return false;
    return currentMember.roles.some(r => {
      const roleData = roles.find(rd => rd.id === r.id);
      return roleData?.permissions?.includes(permission);
    });
  };

  // Check if user can manage a role at given position (waterfall logic)
  const canManageRole = (rolePosition: number | null): boolean => {
    if (isGod) return true; // Gods can manage ANY role
    if (!hasPermission('manage_roles')) return false;
    // Can only manage roles STRICTLY below own highest position
    return (rolePosition ?? 0) < userHighestRolePosition;
  };

  // Check if user can assign a specific role
  const canAssignRole = (roleId: string): boolean => {
    if (isGod) return true; // Gods can assign any role including to themselves
    const roleData = roles.find(r => r.id === roleId);
    if (!roleData) return false;
    return canManageRole(roleData.position);
  };

  // Check if user can drag/reorder a role
  const canDragRole = (rolePosition: number | null): boolean => {
    if (isGod) return true; // Gods can drag ANY role
    if (!hasPermission('manage_roles')) return false;
    // Can only drag roles below own highest position
    return (rolePosition ?? 0) < userHighestRolePosition;
  };

  return {
    isOwner,
    isSecondaryOwner,
    isGod,
    hasPermission,
    canManageRole,
    canAssignRole,
    canDragRole,
    userHighestRolePosition,
    currentMember,
    roles,
  };
}

// Hook to check if user can access server settings
export function useCanAccessServerSettings(serverId: string | null): boolean {
  const { hasPermission, isGod } = usePermissions(serverId);
  
  if (isGod) return true;
  return hasPermission('manage_server') || hasPermission('administrator');
}
