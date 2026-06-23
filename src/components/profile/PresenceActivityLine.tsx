import { useEffect, useState } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Status = 'online' | 'idle' | 'dnd' | 'offline' | string;

interface Presence {
  status: Status;
  last_seen_at: string | null;
  last_activity_at: string | null;
}

interface PresenceActivityLineProps {
  userId: string;
  /** Fallback values when not yet hydrated from DB */
  fallbackStatus?: Status;
  className?: string;
}

const statusColor: Record<string, string> = {
  online: 'text-status-online',
  idle: 'text-status-idle',
  dnd: 'text-status-dnd',
  offline: 'text-muted-foreground',
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'inconnu';
  try {
    return formatDistanceToNowStrict(new Date(iso), { locale: fr, addSuffix: true });
  } catch {
    return 'inconnu';
  }
}

function formatAbsolute(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(new Date(iso), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return null;
  }
}

export function PresenceActivityLine({ userId, fallbackStatus, className }: PresenceActivityLineProps) {
  const [presence, setPresence] = useState<Presence | null>(null);
  // tick toutes les 30s pour rafraîchir le libellé relatif
  const [, setTick] = useState(0);

  // Initial fetch + realtime subscription on this specific profile row
  useEffect(() => {
    if (!userId) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('status, last_seen_at, last_activity_at')
        .eq('id', userId)
        .maybeSingle();
      if (active && data) {
        setPresence({
          status: (data.status as Status) ?? 'offline',
          last_seen_at: (data as any).last_seen_at ?? null,
          last_activity_at: (data as any).last_activity_at ?? null,
        });
      }
    })();

    const channel = supabase
      .channel(`presence-line:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as any;
          setPresence({
            status: (row.status as Status) ?? 'offline',
            last_seen_at: row.last_seen_at ?? null,
            last_activity_at: row.last_activity_at ?? null,
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const status: Status = presence?.status ?? fallbackStatus ?? 'offline';
  const lastSeen = presence?.last_seen_at ?? null;
  const lastActivity = presence?.last_activity_at ?? null;

  let label: string;
  let tooltipIso: string | null = null;

  switch (status) {
    case 'online':
      label = 'Actif maintenant';
      tooltipIso = lastActivity ?? lastSeen;
      break;
    case 'idle':
      label = `Inactif ${formatRelative(lastActivity ?? lastSeen)}`;
      tooltipIso = lastActivity ?? lastSeen;
      break;
    case 'dnd':
      label = 'Ne pas déranger';
      tooltipIso = lastActivity ?? lastSeen;
      break;
    case 'offline':
    default:
      label = lastSeen ? `Vu ${formatRelative(lastSeen)}` : 'Hors ligne';
      tooltipIso = lastSeen;
      break;
  }

  const tooltipText = formatAbsolute(tooltipIso);

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] leading-tight',
        statusColor[status] ?? 'text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'online' && 'bg-status-online',
          status === 'idle' && 'bg-status-idle',
          status === 'dnd' && 'bg-status-dnd',
          status === 'offline' && 'bg-status-offline',
        )}
      />
      <span className="truncate">{label}</span>
    </span>
  );

  if (!tooltipText) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
