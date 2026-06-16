import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { membersMutationLockRef, MemberWithProfile } from "@/hooks/useMembers";
import { lockPermissionsMutation } from "@/hooks/usePermissionsRealtime";
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

  // Reactive subscription to the members cache — re-renders when cache changes
  const { data: isChecked = false } = useQuery<MemberWithProfile[], Error, boolean>({
    queryKey: ["members", serverId],
    queryFn: () => Promise.resolve(queryClient.getQueryData<MemberWithProfile[]>(["members", serverId]) ?? []),
    select: (members) => {
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
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (disabled || isPending) return;

      const hasRoleNow = getHasRoleNow();
      const shouldRemove = hasRoleNow;

      setIsPending(true);
      membersMutationLockRef.current = true;
      lockPermissionsMutation(600);

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
      } finally {
        setIsPending(false);
        setTimeout(() => {
          membersMutationLockRef.current = false;
        }, 350);
      }
    },
    [disabled, getHasRoleNow, isPending, memberId, queryClient, role, serverId, userId]
  );

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
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
