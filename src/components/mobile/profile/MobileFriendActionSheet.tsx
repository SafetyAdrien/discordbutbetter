import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdaptiveSheet } from '@/components/ui/adaptive-sheet';
import {
  MessageCircle,
  Star,
  StarOff,
  UserMinus,
  UserX,
  User,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { MobileFriendCardData } from './MobileFriendCard';

interface MobileFriendActionSheetProps {
  friend: MobileFriendCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessage: () => void;
  onToggleFavorite: () => void;
  onViewProfile: () => void;
  onCall?: () => void;
  onRemove: () => void;
  onBlock?: () => void;
}

interface ActionRow {
  icon: typeof Star;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  iconClass?: string;
}

export function MobileFriendActionSheet({
  friend,
  open,
  onOpenChange,
  onMessage,
  onToggleFavorite,
  onViewProfile,
  onCall,
  onRemove,
  onBlock,
}: MobileFriendActionSheetProps) {
  if (!friend) return null;

  const close = () => onOpenChange(false);

  const actions: ActionRow[] = [
    {
      icon: User,
      label: 'Voir le profil',
      onClick: () => {
        haptics.selection();
        close();
        onViewProfile();
      },
    },
    {
      icon: MessageCircle,
      label: 'Envoyer un message',
      onClick: () => {
        haptics.selection();
        close();
        onMessage();
      },
    },
    {
      icon: friend.isFavorite ? StarOff : Star,
      label: friend.isFavorite ? 'Retirer des favoris' : 'Mettre en favori',
      onClick: () => {
        haptics.success();
        close();
        onToggleFavorite();
      },
      iconClass: friend.isFavorite ? '' : 'text-[hsl(var(--idle))]',
    },
    ...(onCall
      ? [
          {
            icon: Phone,
            label: 'Appeler',
            onClick: () => {
              haptics.selection();
              close();
              onCall();
            },
          } as ActionRow,
        ]
      : []),
    ...(onBlock
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
      icon: UserMinus,
      label: "Supprimer l'ami",
      onClick: () => {
        haptics.warning();
        close();
        onRemove();
      },
      destructive: true,
    },
  ];

  return (
    <AdaptiveSheet open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col">
        {/* Friend header */}
        <div className="flex items-center gap-3 px-2 pb-4 border-b border-border/40">
          <Avatar className="w-12 h-12">
            <AvatarImage src={friend.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {(friend.displayName || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{friend.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
          </div>
        </div>

        {/* Actions */}
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
                <Icon className={cn('w-4.5 h-4.5', iconClass)} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </AdaptiveSheet>
  );
}
