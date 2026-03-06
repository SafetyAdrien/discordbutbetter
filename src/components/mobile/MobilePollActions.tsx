import { useState } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Link, Pencil, Trash2, StopCircle, Hash, ClipboardCopy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

interface MobilePollActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnPoll: boolean;
  isPollExpired: boolean;
  onCopyLink: () => void;
  onCopyId: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onEndPoll?: () => void;
  onAddReaction?: (emoji: string) => void;
}

export function MobilePollActions({
  open,
  onOpenChange,
  isOwnPoll,
  isPollExpired,
  onCopyLink,
  onCopyId,
  onEdit,
  onDelete,
  onEndPoll,
  onAddReaction,
}: MobilePollActionsProps) {
  const handleAction = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <VisuallyHidden><DrawerTitle>Actions du sondage</DrawerTitle></VisuallyHidden>

        {/* Quick Reactions */}
        {onAddReaction && (
          <div className="flex items-center justify-center gap-2 px-4 pt-3 pb-2">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleAction(() => onAddReaction(emoji))}
                className="w-11 h-11 flex items-center justify-center text-2xl rounded-full hover:bg-muted active:scale-90 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Action list */}
        <div className="px-2 pb-4 space-y-0.5">
          <ActionButton icon={Link} label="Copier le lien" onClick={() => handleAction(onCopyLink)} />
          <ActionButton icon={ClipboardCopy} label="Copier l'ID" onClick={() => handleAction(onCopyId)} />

          {isOwnPoll && (
            <>
              <div className="h-px bg-border mx-2 my-1" />
              {!isPollExpired && onEndPoll && (
                <ActionButton icon={StopCircle} label="Terminer le sondage" onClick={() => handleAction(onEndPoll)} />
              )}
              {onEdit && (
                <ActionButton icon={Pencil} label="Modifier le sondage" onClick={() => handleAction(onEdit)} />
              )}
              {onDelete && (
                <ActionButton
                  icon={Trash2}
                  label="Supprimer le sondage"
                  onClick={() => handleAction(onDelete)}
                  destructive
                />
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-muted'
      )}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}
