import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useServerRoles } from "@/hooks/useRoles";
import { RoleCheckboxItem } from "@/components/profile/RoleCheckboxItem";
import * as Portal from "@radix-ui/react-portal";

interface RoleManagementPanelProps {
  serverId: string;
  memberId: string;
  userId: string;
  onClose: () => void;
  position?: { top: number; right: number };
}

export function RoleManagementPanel({
  serverId,
  memberId,
  userId,
  onClose,
  position,
}: RoleManagementPanelProps) {
  const { data: allRoles = [] } = useServerRoles(serverId);

  const assignableRoles = allRoles
    .filter((role) => !role.is_default)
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  if (assignableRoles.length === 0) return null;

  return (
    <Portal.Root>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      >
        <div
          className="absolute w-64 bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-slide-in-right"
          style={{
            top: position?.top ?? 60,
            right: position?.right ?? 280,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h4 className="font-semibold text-sm">Gérer les rôles</h4>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="p-2 space-y-1">
              {assignableRoles.map((role) => (
                <RoleCheckboxItem
                  key={role.id}
                  role={role}
                  serverId={serverId}
                  memberId={memberId}
                  userId={userId}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Portal.Root>
  );
}
