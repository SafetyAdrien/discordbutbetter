import { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Pin, Bell, BellOff, BellRing, AtSign, Hash } from 'lucide-react';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import StreamlineSummaries from '@/components/icons/StreamlineSummaries';
import { cn } from '@/lib/utils';

interface MobileChannelDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName: string;
  channelType: string;
  description?: string;
  pinnedCount?: number;
  ChannelIcon?: React.ElementType;
  onShowPinned?: () => void;
  onShowThreads?: () => void;
  onShowSummaries?: () => void;
  onSetNotifications?: (mode: 'all' | 'mentions' | 'none') => void;
  notificationMode?: 'all' | 'mentions' | 'none';
}

/**
 * Bottom sheet shown when tapping the channel name in the compact mobile header.
 * Aggregates description + pinned/threads/summaries/notifications.
 */
export function MobileChannelDetailSheet({
  open,
  onOpenChange,
  channelName,
  channelType,
  description,
  pinnedCount = 0,
  ChannelIcon = Hash,
  onShowPinned,
  onShowThreads,
  onShowSummaries,
  onSetNotifications,
  notificationMode = 'all',
}: MobileChannelDetailSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
        <VisuallyHidden><DrawerTitle>Détails du salon</DrawerTitle></VisuallyHidden>

        <div className="px-4 pt-2 pb-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ChannelIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{channelName}</h3>
              <p className="text-xs text-muted-foreground capitalize">{channelType}</p>
            </div>
          </div>

          {description && (
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">{description}</p>
          )}

          {/* Quick actions */}
          <div className="space-y-0.5">
            {onShowPinned && (
              <DetailRow
                icon={Pin}
                label="Messages épinglés"
                meta={pinnedCount > 0 ? String(pinnedCount) : undefined}
                onClick={() => { onShowPinned(); onOpenChange(false); }}
              />
            )}
            {onShowThreads && (
              <DetailRow
                icon={StreamlineThreads}
                label="Fils de discussion"
                onClick={() => { onShowThreads(); onOpenChange(false); }}
              />
            )}
            {onShowSummaries && (
              <DetailRow
                icon={StreamlineSummaries}
                label="Résumés"
                onClick={() => { onShowSummaries(); onOpenChange(false); }}
              />
            )}
          </div>

          {/* Notifications group */}
          {onSetNotifications && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1.5">
                Notifications
              </h4>
              <div className="space-y-0.5">
                <NotifRow
                  icon={BellRing}
                  label="Tous les messages"
                  active={notificationMode === 'all'}
                  onClick={() => { onSetNotifications('all'); onOpenChange(false); }}
                />
                <NotifRow
                  icon={AtSign}
                  label="Mentions uniquement"
                  active={notificationMode === 'mentions'}
                  onClick={() => { onSetNotifications('mentions'); onOpenChange(false); }}
                />
                <NotifRow
                  icon={BellOff}
                  label="Aucun"
                  active={notificationMode === 'none'}
                  onClick={() => { onSetNotifications('none'); onOpenChange(false); }}
                />
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function DetailRow({
  icon: Icon,
  label,
  meta,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-muted/60 transition-colors min-h-[48px] text-left"
    >
      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      {meta && (
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{meta}</span>
      )}
    </button>
  );
}

function NotifRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-muted/60 transition-colors min-h-[48px] text-left',
        active && 'bg-primary/10'
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      <span className={cn('flex-1 text-sm font-medium', active && 'text-primary')}>{label}</span>
    </button>
  );
}
