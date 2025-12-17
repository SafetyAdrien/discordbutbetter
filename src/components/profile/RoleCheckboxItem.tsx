import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { RoleWithPermissions } from "@/hooks/useRoles";
import { membersMutationLockRef } from "@/hooks/useMembers";

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
 * Isolated checkbox item:
 * - local state only (no parent rerender)
 * - optimistic UI with mutation locking
 * - rollback on error
 * - prevents event bubbling
 */
export function RoleCheckboxItem({ role, serverId, memberId, defaultChecked, disabled }: RoleCheckboxItemProps) {
  const [isChecked, setIsChecked] = useState(defaultChecked);
  const [isPending, setIsPending] = useState(false);

  // Sync when defaultChecked changes from outside (e.g., switching users)
  // But skip if we're in a mutation (local state is authoritative during mutations)
  useEffect(() => {
    if (isPending || membersMutationLockRef.current) return;
    setIsChecked(defaultChecked);
  }, [defaultChecked, memberId, role.id, isPending]);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (disabled || isPending) return;

      const prev = isChecked;
      const next = !prev;

      // Lock mutations to prevent Realtime interference
      membersMutationLockRef.current = true;
      
      // Optimistic UI: update immediately
      setIsChecked(next);
      setIsPending(true);

      try {
        if (next) {
          // Use upsert with onConflict to handle duplicate key gracefully
          const { error } = await supabase
            .from("member_roles")
            .upsert(
              { member_id: memberId, role_id: role.id },
              { onConflict: "member_id,role_id", ignoreDuplicates: true }
            );
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("member_roles")
            .delete()
            .eq("member_id", memberId)
            .eq("role_id", role.id);
          if (error) throw error;
        }
      } catch (err: any) {
        console.error("[RoleCheckboxItem] Failed to toggle member role", {
          serverId,
          memberId,
          roleId: role.id,
          roleName: role.name,
          next,
          err,
        });

        const code = err?.code ?? err?.status;
        const message = err?.message ?? "Erreur inconnue";

        toast.error("Échec de la modification du rôle", {
          description: code ? `(${code}) ${message}` : message,
        });

        // Rollback on error
        setIsChecked(prev);
      } finally {
        setIsPending(false);
        // Release lock after a short delay to let any pending Realtime events pass
        setTimeout(() => {
          membersMutationLockRef.current = false;
        }, 300);
      }
    },
    [disabled, isPending, isChecked, memberId, role.id, role.name, serverId],
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
      aria-pressed={isChecked}
      disabled={disabled}
    >
      <Checkbox checked={isChecked} disabled={disabled || isPending} className="pointer-events-none" tabIndex={-1} />

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
