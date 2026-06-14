import { ReactNode, useMemo, useState } from 'react';
import { AtSign, Users, Megaphone, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMembers } from '@/hooks/useMembers';
import { cn } from '@/lib/utils';

interface EveryoneHerePopupProps {
  type: 'everyone' | 'here';
  serverId?: string;
  children: ReactNode;
}

const STATUS_DOT: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

const ONLINE_STATUSES = new Set(['online', 'idle', 'dnd']);

export function EveryoneHerePopup({ type, serverId, children }: EveryoneHerePopupProps) {
  const [open, setOpen] = useState(false);
  const { data: members = [] } = useMembers(serverId ?? null);

  const isHere = type === 'here';

  const targets = useMemo(() => {
    const all = members.map((m) => ({
      id: m.user.id,
      displayName:
        m.serverProfile?.display_name || m.nickname || m.user.display_name || m.user.username,
      avatar: m.serverProfile?.avatar_url || m.user.avatar_url,
      status: (m.user.status || 'offline') as keyof typeof STATUS_DOT,
    }));
    const filtered = isHere ? all.filter((m) => ONLINE_STATUSES.has(m.status)) : all;
    return filtered.sort((a, b) => {
      const aOn = a.status !== 'offline' ? 0 : 1;
      const bOn = b.status !== 'offline' ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [members, isHere]);

  const counts = useMemo(() => {
    const c = { online: 0, idle: 0, dnd: 0, offline: 0 };
    for (const m of targets) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [targets]);

  const color = isHere ? '#43b581' : '#5865f2';
  const title = isHere ? '@here' : '@everyone';
  const description = isHere
    ? 'Notifie uniquement les membres en ligne, inactifs ou en NPD.'
    : 'Notifie tous les membres du serveur, même hors ligne.';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
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
          {isHere ? (
            <Megaphone className="w-4 h-4" style={{ color }} />
          ) : (
            <AtSign className="w-4 h-4" style={{ color }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ color }}>
              {title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {isHere ? 'Mention contextuelle' : 'Mention globale'}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-3 py-2 flex items-center gap-3 text-xs border-b border-border">
          <span className="flex items-center gap-1.5 text-foreground">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{targets.length}</span>
            <span className="text-muted-foreground">
              {isHere ? 'notifié(s)' : `membre${targets.length > 1 ? 's' : ''}`}
            </span>
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
            {!isHere && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--offline))]" />
                {counts.offline}
              </span>
            )}
          </span>
        </div>

        {/* Description */}
        <div className="px-3 py-2 border-b border-border flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{description}</span>
        </div>

        {/* Members */}
        <ScrollArea className="max-h-60">
          <div className="py-1">
            {targets.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                Aucun membre concerné.
              </div>
            ) : (
              targets.map((m) => (
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
      </PopoverContent>
    </Popover>
  );
}
