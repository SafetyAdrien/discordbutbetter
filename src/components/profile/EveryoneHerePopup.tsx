import { ReactNode, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMembers } from '@/hooks/useMembers';

interface EveryoneHerePopupProps {
  type: 'everyone' | 'here';
  serverId?: string;
  children: ReactNode;
}

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
      status: (m.user.status || 'offline') as string,
    }));
    const filtered = isHere ? all.filter((m) => ONLINE_STATUSES.has(m.status)) : all;
    return filtered.sort((a, b) => {
      const aOn = a.status !== 'offline' ? 0 : 1;
      const bOn = b.status !== 'offline' ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [members, isHere]);

  const title = isHere ? '@here' : '@everyone';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 p-0 overflow-hidden bg-popover border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
        </div>

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
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.avatar ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {m.displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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
