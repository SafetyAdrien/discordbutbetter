import { ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

const statusLabels: Record<string, string> = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne',
};

interface Props {
  onBack: () => void;
  displayName: string;
  avatarUrl: string | null;
  status?: 'online' | 'idle' | 'dnd' | 'offline' | null;
  isGroup: boolean;
  groupSize?: number;
  isTyping?: boolean;
  hasActiveCall?: boolean;
  onOpenInfo: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onMore: () => void;
  callsDisabled?: boolean;
}

export function MobileDMHeader({
  onBack,
  displayName,
  avatarUrl,
  status,
  isGroup,
  groupSize,
  isTyping,
  hasActiveCall,
  onOpenInfo,
  onVoiceCall,
  onVideoCall,
  onMore,
  callsDisabled,
}: Props) {
  const subtitle = isTyping
    ? "en train d'écrire…"
    : isGroup
      ? `${groupSize ?? '?'} membres`
      : status
        ? statusLabels[status]
        : '';

  const safeStatus = status || 'offline';

  return (
    <header
      className="flex items-center gap-2 px-2 h-14 border-b border-border bg-[hsl(var(--surface-header))]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <button
        type="button"
        onClick={() => {
          haptics.selection();
          onBack();
        }}
        aria-label="Retour"
        className="w-11 h-11 flex items-center justify-center rounded-full active:bg-muted/60"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => {
          haptics.selection();
          onOpenInfo();
        }}
        aria-label="Voir les infos de la conversation"
        className="flex items-center gap-2.5 flex-1 min-w-0 py-1 pr-2 rounded-xl active:bg-muted/60"
      >
        <div className="relative shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {(displayName || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isGroup && status && (
            <div
              className={cn(
                'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[hsl(var(--surface-header))]',
                statusColors[safeStatus],
              )}
              aria-hidden
            />
          )}
          {hasActiveCall && (
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[hsl(var(--online))] border-2 border-[hsl(var(--surface-header))] animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          {subtitle && (
            <p
              className={cn(
                'text-[11px] truncate',
                isTyping ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            onVoiceCall();
          }}
          disabled={callsDisabled}
          aria-label="Appel vocal"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-muted/60 disabled:opacity-40"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            onVideoCall();
          }}
          disabled={callsDisabled}
          aria-label="Appel vidéo"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-muted/60 disabled:opacity-40"
        >
          <Video className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            onMore();
          }}
          aria-label="Plus d'options"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-muted/60"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
