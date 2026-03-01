import { useState } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Reply, Pencil, Trash2, Link, Pin, SmilePlus, ClipboardCopy, Flag } from 'lucide-react';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { DeleteMessageDialog } from '@/components/chat/DeleteMessageDialog';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

const EMOJI_GRID = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
];

interface MobileMessageActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnMessage: boolean;
  isPinned?: boolean;
  messageContent?: string;
  onReply: () => void;
  onAddReaction?: (emoji: string) => void;
  onCopyLink: () => void;
  onCopyId: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateThread?: () => void;
  onPin?: () => void;
  canAddReactions?: boolean;
  canManageMessages?: boolean;
}

export function MobileMessageActions({
  open,
  onOpenChange,
  isOwnMessage,
  isPinned = false,
  messageContent,
  onReply,
  onAddReaction,
  onCopyLink,
  onCopyId,
  onEdit,
  onDelete,
  onCreateThread,
  onPin,
  canAddReactions = true,
  canManageMessages = false,
}: MobileMessageActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleAction = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <VisuallyHidden><DrawerTitle>Actions</DrawerTitle></VisuallyHidden>

        {/* Quick Reactions */}
        {canAddReactions && onAddReaction && (
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
            <button
              onClick={() => {/* keep open, show grid below */}}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <SmilePlus className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Message preview */}
        {messageContent && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded-lg px-3 py-2">
              {messageContent}
            </p>
          </div>
        )}

        {/* Action list */}
        <div className="px-2 pb-4 space-y-0.5">
          <ActionButton icon={Reply} label="Répondre" onClick={() => handleAction(onReply)} />
          
          {onCreateThread && (
            <ActionButton icon={StreamlineThreads} label="Créer un thread" onClick={() => handleAction(onCreateThread)} />
          )}

          {isOwnMessage && onEdit && (
            <ActionButton icon={Pencil} label="Modifier" onClick={() => handleAction(onEdit)} />
          )}

          {onPin && (
            <ActionButton
              icon={Pin}
              label={isPinned ? 'Désépingler' : 'Épingler'}
              onClick={() => handleAction(onPin)}
            />
          )}

          <ActionButton icon={Link} label="Copier le lien" onClick={() => handleAction(onCopyLink)} />
          <ActionButton icon={ClipboardCopy} label="Copier l'ID" onClick={() => handleAction(onCopyId)} />

          {(isOwnMessage || canManageMessages) && onDelete && (
            <>
              <div className="h-px bg-border mx-2 my-1" />
              <ActionButton
                icon={Trash2}
                label="Supprimer"
                onClick={() => { onOpenChange(false); setDeleteOpen(true); }}
                destructive
              />
            </>
          )}
        </div>

        <DeleteMessageDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => { onDelete?.(); setDeleteOpen(false); }} />
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
