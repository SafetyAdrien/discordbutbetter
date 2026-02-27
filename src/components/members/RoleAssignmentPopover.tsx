import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';
import { useServerRoles } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { MemberWithProfile } from '@/hooks/useMembers';
import { RoleCheckboxItem } from '@/components/profile/RoleCheckboxItem';

interface RoleAssignmentPopoverProps {
  member: MemberWithProfile;
  serverId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Render as a centered Dialog instead of a Popover (for context menu usage) */
  asDialog?: boolean;
}

function RoleListContent({ member, serverId }: { member: MemberWithProfile; serverId: string }) {
  const { data: roles = [] } = useServerRoles(serverId);
  const { canAssignRole, isGod } = usePermissions(serverId);

  const assignableRoles = [...roles]
    .filter(r => !r.is_default)
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  return (
    <>
      <ScrollArea className="max-h-[300px]">
        <div className="p-2 space-y-0.5">
          {assignableRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun rôle disponible
            </p>
          ) : (
            assignableRoles.map((role) => (
              <RoleCheckboxItem
                key={role.id}
                role={role}
                serverId={serverId}
                memberId={member.id}
                userId={member.user.id}
                disabled={!canAssignRole(role.id)}
              />
            ))
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
    </>
  );
}

export function RoleAssignmentPopover({
  member,
  serverId,
  trigger,
  open: controlledOpen,
  onOpenChange,
  asDialog = false,
}: RoleAssignmentPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  // Dialog mode — used when triggered from context menu (no anchor element)
  if (asDialog) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-72 p-0 gap-0" onClick={e => e.stopPropagation()}>
          <DialogHeader className="p-3 border-b border-border">
            <DialogTitle className="text-sm font-semibold">Gérer les rôles</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {member.user.display_name}
            </p>
          </DialogHeader>
          <RoleListContent member={member} serverId={serverId} />
        </DialogContent>
      </Dialog>
    );
  }

  // Popover mode — used when there's a visible trigger element
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
      <PopoverContent className="w-72 p-0" align="end" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Gérer les rôles</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {member.user.display_name}
          </p>
        </div>
        <RoleListContent member={member} serverId={serverId} />
      </PopoverContent>
    </Popover>
  );
}
