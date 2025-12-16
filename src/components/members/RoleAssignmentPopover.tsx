import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServerRoles, useAssignRoleToMember, useRemoveRoleFromMember, RoleWithPermissions } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { MemberWithProfile } from '@/hooks/useMembers';

interface RoleAssignmentPopoverProps {
  member: MemberWithProfile;
  serverId: string;
  trigger?: React.ReactNode;
}

export function RoleAssignmentPopover({ member, serverId, trigger }: RoleAssignmentPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data: roles = [] } = useServerRoles(serverId);
  const assignRole = useAssignRoleToMember();
  const removeRole = useRemoveRoleFromMember();
  const { canAssignRole, isGod } = usePermissions(serverId);

  // Get member's current role IDs
  const memberRoleIds = member.roles?.map(r => r.id) || [];

  // Sort roles by position (highest first)
  const sortedRoles = [...roles].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  // Filter out @everyone (is_default) from the list - it's automatically assigned
  const assignableRoles = sortedRoles.filter(r => !r.is_default);

  const handleToggleRole = async (role: RoleWithPermissions) => {
    const hasRole = memberRoleIds.includes(role.id);
    
    if (hasRole) {
      removeRole.mutate({
        memberId: member.id,
        roleId: role.id,
        serverId,
      });
    } else {
      assignRole.mutate({
        memberId: member.id,
        roleId: role.id,
        serverId,
      });
    }
  };

  const isPending = assignRole.isPending || removeRole.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 gap-2">
            <Shield className="w-4 h-4" />
            Gérer les rôles
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Gérer les rôles</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {member.user.display_name}
          </p>
        </div>
        
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {assignableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun rôle disponible
              </p>
            ) : (
              assignableRoles.map((role) => {
                const hasRole = memberRoleIds.includes(role.id);
                const canModify = canAssignRole(role.id);
                
                return (
                  <label
                    key={role.id}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md transition-colors cursor-pointer",
                      canModify ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Checkbox
                      checked={hasRole}
                      onCheckedChange={() => canModify && handleToggleRole(role)}
                      disabled={!canModify || isPending}
                      className="border-muted-foreground/30"
                    />
                    
                    {/* Role icon or color circle */}
                    {role.icon_url && !role.icon_url.startsWith('http') ? (
                      <span className="text-sm">{role.icon_url}</span>
                    ) : role.icon_url ? (
                      <img src={role.icon_url} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: role.color || '#99AAB5' }}
                      />
                    )}
                    
                    <span 
                      className="text-sm flex-1 truncate"
                      style={{ color: role.color || undefined }}
                    >
                      {role.name}
                    </span>
                    
                    {isPending && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {!isGod && (
          <div className="p-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Vous pouvez uniquement assigner des rôles inférieurs au vôtre
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
