import { useCallback } from "react";
import { Loader2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAssignRoleToMember, useRemoveRoleFromMember, type RoleWithPermissions } from "@/hooks/useRoles";

type RoleMini = Pick<RoleWithPermissions, "id" | "name" | "color" | "icon_url" | "position" | "description">;

function RoleIconMini({ role }: { role: RoleMini }) {
  if (role.icon_url) {
    if (!role.icon_url.startsWith("http")) {
      return <span className="text-xs">{role.icon_url}</span>;
    }

    return <img src={role.icon_url} alt="" className="w-3 h-3 object-contain" loading="lazy" />;
  }

  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: role.color || "#99AAB5" }}
    />
  );
}

interface RoleCheckboxItemProps {
  role: RoleMini;
  serverId: string;
  memberId: string;
  defaultChecked: boolean;
  disabled?: boolean;
}

/**
 * Checkbox item using mutations from useRoles.ts:
 * - Optimistic UI via React Query
 * - Mutation lock prevents Realtime conflicts
 * - Instant updates via cache manipulation
 */
export function RoleCheckboxItem({ role, serverId, memberId, defaultChecked, disabled }: RoleCheckboxItemProps) {
  const assignRole = useAssignRoleToMember();
  const removeRole = useRemoveRoleFromMember();

  const isPending = assignRole.isPending || removeRole.isPending;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (disabled || isPending) return;

      const next = !defaultChecked;

      if (next) {
        // Assign role with full role data for optimistic update
        assignRole.mutate({
          memberId,
          roleId: role.id,
          serverId,
          role: role as RoleWithPermissions,
        });
      } else {
        // Remove role
        removeRole.mutate({
          memberId,
          roleId: role.id,
          serverId,
        });
      }
    },
    [disabled, isPending, defaultChecked, memberId, role, serverId, assignRole, removeRole],
  );

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent focus/click bubbling early
        e.stopPropagation();
      }}
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2 p-1.5 rounded transition-colors",
        !disabled && !isPending ? "hover:bg-muted/50" : "opacity-60 cursor-not-allowed",
      )}
      aria-pressed={defaultChecked}
      disabled={disabled}
    >
      <Checkbox checked={defaultChecked} disabled={disabled || isPending} className="pointer-events-none" tabIndex={-1} />

      <span className="flex items-center gap-1.5 flex-1 text-sm text-left">
        <RoleIconMini role={role} />
        <span style={{ color: role.color || undefined }} className="truncate">
          {role.name}
        </span>
      </span>

      {isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
    </button>
  );
}
