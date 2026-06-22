import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { lockMembersMutation, MemberWithProfile } from "@/hooks/useMembers";
import { lockPermissionsMutation } from "@/hooks/usePermissionsRealtime";
import type { RoleWithPermissions } from "@/hooks/useRoles";
import {
  setRoleMutationPending,
  clearRoleMutationPending,
  getRoleMutationTarget,
} from "@/lib/role-mutation-tracker";

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
  userId?: string;
  disabled?: boolean;
}

/**
 * Isolated checkbox item that reactively subscribes to the members cache
 * via useQuery + select, so it re-renders instantly on optimistic updates
 * and Realtime changes.
 */
export function RoleCheckboxItem({ role, serverId, memberId, userId, disabled }: RoleCheckboxItemProps) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  // Short grace period after the network request succeeds. Keeps the mutation
  // target active so a stale background refetch cannot briefly revert the
  // checkbox, while the UI itself is unlocked immediately.
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Reactive subscription to the members cache — re-renders when cache changes
  const { data: isChecked = false } = useQuery<MemberWithProfile[], Error, boolean>({
    queryKey: ["members", serverId],
    queryFn: () => Promise.resolve(queryClient.getQueryData<MemberWithProfile[]>(["members", serverId]) ?? []),
    select: (members) => {
      const target = getRoleMutationTarget(serverId, memberId, role.id);
      if (target) return target === "add";
      const member = members?.find((m) => m.id === memberId);
      return member?.roles?.some((r: any) => r.id === role.id) ?? false;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Snapshot read for the click handler (needs immediate value, not stale render)
  const getHasRoleNow = useCallback(() => {
    const members = queryClient.getQueryData<MemberWithProfile[]>(["members", serverId]);
    const member = members?.find((m) => m.id === memberId);
    return member?.roles?.some((r: any) => r.id === role.id) ?? false;
  }, [memberId, queryClient, role.id, serverId]);

  const handleRoleToggle = useCallback(
    async (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (disabled || isPending) return;

      const hasRoleNow = getHasRoleNow();
      const shouldRemove = hasRoleNow;

      setIsPending(true);
      lockMembersMutation(500);
      lockPermissionsMutation(500);
      setRoleMutationPending(serverId, memberId, role.id, shouldRemove ? "remove" : "add");

      const previousMembers = queryClient.getQueryData(["members", serverId]);

      // Optimistic update
      queryClient.setQueryData(["members", serverId], (old: MemberWithProfile[] | undefined) =>
        old?.map((m) => {
          if (m.id !== memberId) return m;
          const existingRoles = m.roles || [];

          if (!shouldRemove) {
            if (existingRoles.some((r: any) => r.id === role.id)) return m;
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
          const { error } = await supabase
            .from("member_roles")
            .delete()
            .eq("member_id", memberId)
            .eq("role_id", role.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("member_roles")
            .insert({ member_id: memberId, role_id: role.id })
            .select("id")
            .maybeSingle();
          if (error && error.code !== "23505") throw error;
        }

        // Do NOT invalidate ['members', serverId] — the optimistic patch + realtime
        // subscription keep the cache in sync. An invalidate here triggers a refetch
        // that can briefly return pre-write data and cause a visible flicker.
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        }
        queryClient.invalidateQueries({ queryKey: ["role-member-counts", serverId] });
        [
          'channel-permission', 'channel-permissions', 'user-channel-permissions',
          'user-permissions', 'category-permissions', 'roles', 'role-permissions',
          'member-roles', 'server-channel-permissions',
        ].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      } catch (err: any) {
        console.error("[RoleCheckboxItem] Failed to toggle member role", {
          serverId, memberId, userId, roleId: role.id, roleName: role.name, shouldRemove, err,
        });

        const code = err?.code ?? err?.status;
        const message = err?.message ?? "Erreur inconnue";
        toast.error("Échec de la modification du rôle", {
          description: code ? `(${code}) ${message}` : message,
        });

        // Rollback
        if (previousMembers) queryClient.setQueryData(["members", serverId], previousMembers);
        clearRoleMutationPending(serverId, memberId, role.id);
        membersMutationLockRef.current = false;
        setIsPending(false);
        return;
      }

      // Success: keep isPending/lock active until realtime confirms (handled by listener).
      // Safety net: if realtime never fires, settle after 8s.
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = setTimeout(() => {
        clearRoleMutationPending(serverId, memberId, role.id);
        membersMutationLockRef.current = false;
        setIsPending(false);
      }, 8000);
    },
    [disabled, getHasRoleNow, isPending, memberId, queryClient, role, serverId, userId]
  );

  return (
    <div
      role="checkbox"
      tabIndex={disabled || isPending ? -1 : 0}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={handleRoleToggle}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        handleRoleToggle(e as unknown as React.MouseEvent<HTMLElement>);
      }}
      className={cn(
        "w-full flex items-center gap-2 p-1.5 rounded transition-colors",
        !disabled && !isPending ? "hover:bg-muted/50" : "cursor-not-allowed",
      )}
      aria-checked={isChecked}
      aria-disabled={disabled || isPending}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary transition-colors duration-150",
          isChecked ? "bg-primary text-primary-foreground" : "bg-transparent",
        )}
      >
        <Check className={cn("h-3.5 w-3.5 transition-opacity duration-150", isChecked ? "opacity-100" : "opacity-0")} />
      </span>
      <span className="flex items-center gap-1.5 flex-1 text-sm text-left">
        <RoleIconMini role={role} />
        <span style={{ color: role.color || undefined }} className="truncate">
          {role.name}
        </span>
      </span>
      <span className="flex h-3 w-3 shrink-0 items-center justify-center">
        {isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </span>
    </div>
  );
}
