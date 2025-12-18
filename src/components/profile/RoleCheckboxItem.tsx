import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { membersMutationLockRef } from "@/hooks/useMembers";
import type { RoleWithPermissions } from "@/hooks/useRoles";
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
  /** profile id (used to refresh profile queries instantly) */
  userId?: string;
  defaultChecked: boolean;
  disabled?: boolean;
}

/**
 * Isolated checkbox item:
 * - local state only (no parent rerender)
 * - optimistic UI (fire-and-forget)
 * - rollback on error
 * - prevents event bubbling
 */
export function RoleCheckboxItem({ role, serverId, memberId, userId, defaultChecked, disabled }: RoleCheckboxItemProps) {
  const queryClient = useQueryClient();
  const [isChecked, setIsChecked] = useState(defaultChecked);
  const [isPending, setIsPending] = useState(false);
  // Track if we just finished a local mutation to avoid syncing with stale defaultChecked
  const justMutatedRef = useRef(false);

  // Keep in sync when switching user / reopening panel
  // BUT skip sync if we just completed our own mutation (wait for Realtime to update defaultChecked)
  useEffect(() => {
    if (isPending) return; // Don't sync while mutation in progress
    if (justMutatedRef.current) {
      // We just finished a mutation - skip this sync and wait for next defaultChecked update
      justMutatedRef.current = false;
      return;
    }
    setIsChecked(defaultChecked);
  }, [defaultChecked, memberId, role.id, isPending]);

  const getHasRoleNow = useCallback(() => {
    const members = queryClient.getQueryData<any[]>(["members", serverId]) as any[] | undefined;
    const member = members?.find((m) => m.id === memberId);
    const roles = member?.roles ?? [];
    return roles.some((r: any) => r.id === role.id);
  }, [memberId, queryClient, role.id, serverId]);

  const handleRoleToggle = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (disabled || isPending) return;

      // Source of truth: current roles list (from React Query cache)
      const hasRoleNow = getHasRoleNow();
      const shouldRemove = hasRoleNow;

      const prevChecked = isChecked;
      const nextChecked = shouldRemove ? false : true;

      // Optimistic UI: update immediately
      setIsChecked(nextChecked);
      setIsPending(true);
      membersMutationLockRef.current = true;

      const previousMembers = queryClient.getQueryData(["members", serverId]);

      // Optimistic global update (so the profile card behind updates instantly)
      queryClient.setQueryData(["members", serverId], (old: any[] | undefined) =>
        old?.map((m) => {
          if (m.id !== memberId) return m;

          const existingRoles = m.roles || [];

          if (nextChecked) {
            const alreadyHas = existingRoles.some((r: any) => r.id === role.id);
            if (alreadyHas) return m;

            const roleData = {
              id: role.id,
              name: role.name,
              color: role.color,
              icon_url: role.icon_url,
              position: role.position,
              description: role.description,
            };

            return {
              ...m,
              roles: [...existingRoles, roleData].sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0)),
            };
          }

          return {
            ...m,
            roles: existingRoles.filter((r: any) => r.id !== role.id),
          };
        })
      );

      try {
        if (shouldRemove) {
          // Remove role only
          const { error } = await supabase
            .from("member_roles")
            .delete()
            .eq("member_id", memberId)
            .eq("role_id", role.id);
          if (error) throw error;
        } else {
          // Add role only (ignore duplicate key 23505 for double-click / race)
          const { error } = await supabase
            .from("member_roles")
            .insert({ member_id: memberId, role_id: role.id })
            .select("id")
            .maybeSingle();

          if (error && error.code !== "23505") throw error;
        }

        // Success - mark as just mutated so we skip the next stale sync
        justMutatedRef.current = true;

        // Force refresh profile-related queries so badges update behind without closing popover
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        }
        queryClient.invalidateQueries({ queryKey: ["role-member-counts", serverId] });
      } catch (err: any) {
        console.error("[RoleCheckboxItem] Failed to toggle member role", {
          serverId,
          memberId,
          userId,
          roleId: role.id,
          roleName: role.name,
          shouldRemove,
          err,
        });

        const code = err?.code ?? err?.status;
        const message = err?.message ?? "Erreur inconnue";

        toast.error("Échec de la modification du rôle", {
          description: code ? `(${code}) ${message}` : message,
        });

        // Rollback UI + cache
        setIsChecked(prevChecked);
        if (previousMembers) queryClient.setQueryData(["members", serverId], previousMembers);
      } finally {
        setIsPending(false);
        setTimeout(() => {
          membersMutationLockRef.current = false;
        }, 350);
      }
    },
    [
      disabled,
      getHasRoleNow,
      isChecked,
      isPending,
      memberId,
      queryClient,
      role.color,
      role.description,
      role.icon_url,
      role.id,
      role.name,
      role.position,
      serverId,
      userId,
    ]
  );

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent focus/click bubbling early
        e.stopPropagation();
      }}
      onClick={handleRoleToggle}
      className={cn(
        "w-full flex items-center gap-2 p-1.5 rounded transition-colors",
        !disabled && !isPending ? "hover:bg-muted/50" : "opacity-60 cursor-not-allowed",
      )}
      aria-pressed={isChecked}
      disabled={disabled || isPending}
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
