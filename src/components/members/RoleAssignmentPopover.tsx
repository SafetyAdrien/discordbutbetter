import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServerRoles, RoleWithPermissions } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { MemberWithProfile } from '@/hooks/useMembers';
import { supabase } from '@/integrations/supabase/client';

interface RoleAssignmentPopoverProps {
  member: MemberWithProfile;
  serverId: string;
  trigger?: React.ReactNode;
}

export function RoleAssignmentPopover({ member, serverId, trigger }: RoleAssignmentPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data: roles = [] } = useServerRoles(serverId);
  const { canAssignRole, isGod } = usePermissions(serverId);

  // Local optimistic state for immediate UI feedback
  const [optimisticRoleIds, setOptimisticRoleIds] = useState<Set<string>>(new Set());
  const [pendingRoleIds, setPendingRoleIds] = useState<Set<string>>(new Set());
  const pendingRoleIdsRef = useRef<Set<string>>(new Set());

  // Reset local state when switching to another member
  useEffect(() => {
    setOptimisticRoleIds(new Set((member.roles ?? []).map((r) => r.id)));
    setPendingRoleIds(new Set());
    pendingRoleIdsRef.current = new Set();
  }, [member.id]);

  // When opening the popover, sync once from current props (avoid flicker from stale props during mutations)
  useEffect(() => {
    if (!open) return;
    setOptimisticRoleIds(new Set((member.roles ?? []).map((r) => r.id)));
  }, [open, member.id]);

  // Realtime: keep UI synced when another admin changes roles
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`member-roles:${member.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'member_roles',
          filter: `member_id=eq.${member.id}`,
        },
        (payload) => {
          const roleId = (payload.new as any)?.role_id as string | undefined;
          if (!roleId) return;
          setOptimisticRoleIds((prev) => {
            if (prev.has(roleId)) return prev;
            const next = new Set(prev);
            next.add(roleId);
            return next;
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'member_roles',
          filter: `member_id=eq.${member.id}`,
        },
        (payload) => {
          const roleId = (payload.old as any)?.role_id as string | undefined;
          if (!roleId) return;
          setOptimisticRoleIds((prev) => {
            if (!prev.has(roleId)) return prev;
            const next = new Set(prev);
            next.delete(roleId);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, member.id]);

  // Sort roles by position (highest first)
  const sortedRoles = [...roles].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  // Filter out @everyone (is_default) from the list - it's automatically assigned
  const assignableRoles = sortedRoles.filter((r) => !r.is_default);

  const handleToggleRole = useCallback(
    async (e: React.MouseEvent, role: RoleWithPermissions) => {
      // Prevent event bubbling to avoid closing popover or triggering parent rerenders
      e.stopPropagation();
      e.preventDefault();

      const roleId = role.id;
      if (pendingRoleIdsRef.current.has(roleId)) return;

      const hasRole = optimisticRoleIds.has(roleId);
      const nextChecked = !hasRole;

      // 1) État visuel immédiat (optimistic UI)
      pendingRoleIdsRef.current.add(roleId);
      setPendingRoleIds((prev) => new Set(prev).add(roleId));
      setOptimisticRoleIds((prev) => {
        const next = new Set(prev);
        if (nextChecked) next.add(roleId);
        else next.delete(roleId);
        return next;
      });

      try {
        // 2) Logique base de données (safe toggle)
        if (nextChecked) {
          const { error } = await supabase
            .from('member_roles')
            .insert({ member_id: member.id, role_id: roleId })
            .select('id');

          // Duplicate key = already present → treat as success
          if (error && (error as any).code !== '23505') throw error;
        } else {
          const { error } = await supabase
            .from('member_roles')
            .delete()
            .eq('member_id', member.id)
            .eq('role_id', roleId);
          if (error) throw error;
        }
      } catch (err: any) {
        // Rollback ONLY on real errors (not duplicates)
        setOptimisticRoleIds((prev) => {
          const next = new Set(prev);
          if (nextChecked) next.delete(roleId);
          else next.add(roleId);
          return next;
        });

        const code = err?.code ?? err?.status;
        const message = err?.message ?? 'Erreur inconnue';
        toast.error('Impossible de modifier le rôle', {
          description: code ? `(${code}) ${message}` : message,
        });
      } finally {
        pendingRoleIdsRef.current.delete(roleId);
        setPendingRoleIds((prev) => {
          const next = new Set(prev);
          next.delete(roleId);
          return next;
        });
      }
    },
    [member.id, optimisticRoleIds],
  );

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
        
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {assignableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun rôle disponible
              </p>
            ) : (
              assignableRoles.map((role) => {
                const hasRole = optimisticRoleIds.has(role.id);
                const isPending = pendingRoleIds.has(role.id);
                const canModify = canAssignRole(role.id);
                
                return (
                  <div
                    key={role.id}
                    onClick={(e) => canModify && !isPending && handleToggleRole(e, role)}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md transition-colors select-none",
                      canModify && !isPending ? "hover:bg-muted cursor-pointer" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Checkbox
                      checked={hasRole}
                      disabled={!canModify || isPending}
                      className="border-muted-foreground/30 pointer-events-none"
                      tabIndex={-1}
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
                  </div>
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