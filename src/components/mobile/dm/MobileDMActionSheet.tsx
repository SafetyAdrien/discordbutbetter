import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdaptiveSheet } from '@/components/ui/adaptive-sheet';
import {
  BellOff,
  Bell,
  CheckCheck,
  MessageCircle,
  Phone,
  Star,
  StarOff,
  Trash2,
  User,
  UserX,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { MobileDMListItemData } from './MobileDMListItem';

interface Props {
  item: MobileDMListItemData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewProfile: () => void;
  onMessage: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onToggleFavorite: () => void;
  onMarkReadToggle: () => void;
  onToggleMute: () => void;
  onBlock?: () => void;
  onArchive: () => void;
}

interface ActionRow {
  icon: typeof Star;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  iconClass?: string;
}

export function MobileDMActionSheet({
  item,
  open,
  onOpenChange,
  onViewProfile,
  onMessage,
  onVoiceCall,
  onVideoCall,
  onToggleFavorite,
  onMarkReadToggle,
  onToggleMute,
  onBlock,
  onArchive,
}: Props) {
  if (!item) return null;
  const close = () => onOpenChange(false);

  const actions: ActionRow[] = [
    ...(!item.isGroup
      ? [
          {
            icon: User,
            label: 'Voir le profil',
            onClick: () => {
              haptics.selection();
              close();
              onViewProfile();
            },
          } as ActionRow,
        ]
      : []),
    {
      icon: MessageCircle,
      label: 'Ouvrir la conversation',
      onClick: () => {
        haptics.selection();
        close();
        onMessage();
      },
    },
    ...(!item.isGroup
      ? [
          {
            icon: Phone,
            label: 'Appel vocal',
            onClick: () => {
              haptics.selection();
              close();
              onVoiceCall();
            },
          } as ActionRow,
          {
            icon: Video,
            label: 'Appel vidéo',
            onClick: () => {
              haptics.selection();
              close();
              onVideoCall();
            },
          } as ActionRow,
        ]
      : []),
    ...(!item.isGroup
      ? [
          {
            icon: item.isFavorite ? StarOff : Star,
            label: item.isFavorite ? 'Retirer des favoris' : 'Mettre en favori',
            onClick: () => {
              haptics.success();
              close();
              onToggleFavorite();
            },
            iconClass: item.isFavorite ? '' : 'text-[hsl(var(--idle))]',
          } as ActionRow,
        ]
      : []),
    {
      icon: CheckCheck,
      label: item.unreadCount > 0 ? 'Marquer comme lu' : 'Marquer comme non lu',
      onClick: () => {
        haptics.success();
        close();
        onMarkReadToggle();
      },
    },
    {
      icon: item.isMuted ? Bell : BellOff,
      label: item.isMuted ? 'Réactiver les notifications' : 'Couper les notifications',
      onClick: () => {
        haptics.medium();
        close();
        onToggleMute();
      },
    },
    ...(onBlock && !item.isGroup
      ? [
          {
            icon: UserX,
            label: 'Bloquer',
            onClick: () => {
              haptics.warning();
              close();
              onBlock();
            },
            destructive: true,
          } as ActionRow,
        ]
      : []),
    {
      icon: Trash2,
      label: 'Archiver la conversation',
      onClick: () => {
        haptics.warning();
        close();
        onArchive();
      },
      destructive: true,
    },
  ];

  return (
    <AdaptiveSheet open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-2 pb-4 border-b border-border/40">
          <Avatar className="w-12 h-12">
            <AvatarImage src={item.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {(item.displayName || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{item.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {item.isGroup ? `${item.groupSize ?? '?'} membres` : item.username ? `@${item.username}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col py-2">
          {actions.map(({ icon: Icon, label, onClick, destructive, iconClass }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={cn(
                'flex items-center gap-3 px-2 py-3 rounded-xl text-left active:bg-muted/60 transition-colors min-h-[44px]',
                destructive && 'text-[hsl(var(--destructive))]',
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  destructive ? 'bg-[hsl(var(--destructive))]/10' : 'bg-muted/60',
                )}
              >
                <Icon className={cn('w-4 h-4', iconClass)} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </AdaptiveSheet>
  );
}
