import { ReactNode, useMemo, useState } from 'react';
import { Copy, Filter, Shield, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useServerRoles } from '@/hooks/useRoles';
import { useMembers } from '@/hooks/useMembers';
import { uuidToSnowflake } from '@/lib/snowflake';
import { copyToClipboard } from '@/lib/clipboard';
import { requestMemberRoleFilter } from '@/hooks/useMemberRoleFilter';
import { cn } from '@/lib/utils';

interface RoleInfoPopupProps {
  roleId: string;
  serverId: string;
  children: ReactNode;
}

const KEY_PERMS: { key: string; label: string; short: string }[] = [
  { key: 'administrator', label: 'Administrateur', short: 'Admin' },
  { key: 'manage_server', label: 'Gérer le serveur', short: 'Gérer serveur' },
  { key: 'manage_channels', label: 'Gérer les salons', short: 'Gérer salons' },
  { key: 'manage_roles', label: 'Gérer les rôles', short: 'Gérer rôles' },
  { key: 'manage_messages', label: 'Gérer les messages', short: 'Gérer msgs' },
  { key: 'kick_members', label: 'Expulser des membres', short: 'Expulser' },
  { key: 'ban_members', label: 'Bannir des membres', short: 'Bannir' },
  { key: 'mention_everyone', label: 'Mentionner @everyone / @here', short: '@everyone' },
];

const STATUS_DOT: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

export function RoleInfoPopup({ roleId, serverId, children }: RoleInfoPopupProps) {
  const [open, setOpen] = useState(false);
  const { data: roles = [] } = useServerRoles(serverId);
  const { data: members = [] } = useMembers(serverId);

  const role = useMemo(() => roles.find((r) => r.id === roleId), [roles, roleId]);

  const roleMembers = useMemo(() => {
    return members
      .filter((m) => m.roles.some((r) => r.id === roleId))
      .map((m) => ({
        id: m.user.id,
        displayName: m.serverProfile?.display_name || m.nickname || m.user.display_name || m.user.username,
        avatar: m.serverProfile?.avatar_url || m.user.avatar_url,
        status: (m.user.status || 'offline') as keyof typeof STATUS_DOT,
      }))
      .sort((a, b) => {
        const aOnline = a.status !== 'offline' ? 0 : 1;
        const bOnline = b.status !== 'offline' ? 0 : 1;
        if (aOnline !== bOnline) return aOnline - bOnline;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [members, roleId]);

  const counts = useMemo(() => {
    const c = { online: 0, idle: 0, dnd: 0, offline: 0 };
    for (const m of roleMembers) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [roleMembers]);

  const activePerms = useMemo(() => {
    if (!role) return [];
    const perms = role.permissions as string[];
    if (perms.includes('administrator')) {
      return KEY_PERMS.filter((p) => p.key === 'administrator');
    }
    return KEY_PERMS.filter((p) => perms.includes(p.key));
  }, [role]);

  const color = role?.color || '#99aab5';

  const handleCopyId = () => {
    copyToClipboard(uuidToSnowflake(roleId), 'ID du rôle copié');
  };

  const handleFilter = () => {
    requestMemberRoleFilter(roleId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="cursor-pointer"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 p-0 overflow-hidden bg-popover border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-3 flex items-center gap-2"
          style={{
            background: `linear-gradient(180deg, ${color}26, transparent)`,
            borderBottom: `2px solid ${color}`,
          }}
        >
          {role?.icon_url ? (
            role.icon_url.startsWith('http') ? (
              <img src={role.icon_url} alt="" className="w-5 h-5 object-contain" />
            ) : (
              <span className="text-base leading-none">{role.icon_url}</span>
            )
          ) : (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ color }}>
              {role?.name ?? 'Rôle inconnu'}
            </div>
            {role?.description ? (
              <div className="text-xs text-muted-foreground truncate">{role.description}</div>
            ) : null}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleCopyId}
                  aria-label="Copier l'ID du rôle"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Copier l'ID</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Stats */}
        <div className="px-3 py-2 flex items-center gap-3 text-xs border-b border-border">
          <span className="flex items-center gap-1.5 text-foreground">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{roleMembers.length}</span>
            <span className="text-muted-foreground">membre{roleMembers.length > 1 ? 's' : ''}</span>
          </span>
          <span className="ml-auto flex items-center gap-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))]" />
              {counts.online}
            </span>
            {counts.idle > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--idle))]" />
                {counts.idle}
              </span>
            )}
            {counts.dnd > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--dnd))]" />
                {counts.dnd}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--offline))]" />
              {counts.offline}
            </span>
          </span>
        </div>

        {/* Key permissions */}
        {activePerms.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              <Shield className="w-3 h-3" />
              Permissions clés
            </div>
            <div className="flex flex-wrap gap-1">
              <TooltipProvider>
                {activePerms.map((p) => (
                  <Tooltip key={p.key}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] py-0 px-1.5 h-5 font-medium',
                          p.key === 'administrator' && 'bg-primary/20 text-primary border-primary/30',
                        )}
                      >
                        {p.short}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">{p.label}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Members */}
        <ScrollArea className="max-h-60">
          <div className="py-1">
            {roleMembers.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                Aucun membre ne possède ce rôle.
              </div>
            ) : (
              roleMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-hover transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.avatar ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {m.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-popover',
                        STATUS_DOT[m.status],
                      )}
                    />
                  </div>
                  <span className="text-sm text-foreground truncate">{m.displayName}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-border flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs flex-1 justify-start gap-1.5"
            onClick={handleFilter}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrer les membres
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
