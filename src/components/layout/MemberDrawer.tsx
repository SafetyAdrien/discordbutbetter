import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MemberList } from './MemberList';
import type { User } from '@/types/app';
import type { MemberWithProfile } from '@/hooks/useMembers';

interface MemberDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: (User & { roles?: MemberWithProfile['roles'] })[];
  ownerId: string;
  serverId: string;
  onOpenDM?: (conversationId: string) => void;
}

export function MemberDrawer({
  open,
  onOpenChange,
  members,
  ownerId,
  serverId,
  onOpenDM,
}: MemberDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-60 p-0 bg-card border-l border-border">
        <MemberList
          members={members}
          ownerId={ownerId}
          serverId={serverId}
          onOpenDM={onOpenDM}
        />
      </SheetContent>
    </Sheet>
  );
}
