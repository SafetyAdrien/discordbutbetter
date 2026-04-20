import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Reply, Pencil, Trash2, Link, Pin, SmilePlus, ClipboardCopy } from 'lucide-react';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DeleteMessageDialog } from '@/components/chat/DeleteMessageDialog';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

interface MessagePreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnMessage: boolean;
  isPinned?: boolean;
  authorName?: string;
  authorAvatar?: string;
  messageContent?: string;
  messageAttachments?: ReactNode;
  onReply: () => void;
  onAddReaction?: (emoji: string) => void;
  onOpenEmojiPicker?: () => void;
  onCopyLink: () => void;
  onCopyId: () => void;
  onCopyText?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateThread?: () => void;
  onPin?: () => void;
  canAddReactions?: boolean;
  canManageMessages?: boolean;
}

/**
 * Discord-style long-press overlay:
 * - Backdrop blur scrim
 * - Pinned message preview at top
 * - Quick reactions row
 * - Action list at bottom
 */
export function MessagePreviewSheet({
  open,
  onOpenChange,
  isOwnMessage,
  isPinned = false,
  authorName,
  authorAvatar,
  messageContent,
  messageAttachments,
  onReply,
  onAddReaction,
  onOpenEmojiPicker,
  onCopyLink,
  onCopyId,
  onCopyText,
  onEdit,
  onDelete,
  onCreateThread,
  onPin,
  canAddReactions = true,
  canManageMessages = false,
}: MessagePreviewSheetProps) {
  const reduced = useReducedMotion();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const close = () => onOpenChange(false);
  const handleAction = (fn: () => void) => {
    fn();
    close();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label="Actions du message"
          >
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Fermer"
              onClick={close}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Content stack */}
            <div className="relative z-10 flex flex-col h-full pointer-events-none">
              {/* Top spacer */}
              <div className="flex-1 min-h-4" onClick={close} />

              {/* Pinned preview */}
              <motion.div
                className="px-4 pointer-events-auto"
                initial={reduced ? { opacity: 1 } : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { y: 20, opacity: 0 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
              >
                <div className="bg-[hsl(var(--surface-2))] rounded-2xl px-3 py-2.5 shadow-xl max-h-[35vh] overflow-hidden">
                  <div className="flex items-start gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {authorAvatar && <AvatarImage src={authorAvatar} />}
                      <AvatarFallback className="text-xs">
                        {authorName?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {authorName && (
                        <div className="text-xs font-semibold text-foreground mb-0.5">{authorName}</div>
                      )}
                      {messageContent && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words line-clamp-6">
                          {messageContent}
                        </p>
                      )}
                      {messageAttachments && (
                        <div className="mt-1.5 max-h-32 overflow-hidden rounded-lg">{messageAttachments}</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick reactions */}
              {canAddReactions && onAddReaction && (
                <motion.div
                  className="px-4 mt-2 pointer-events-auto"
                  initial={reduced ? { opacity: 1 } : { y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { y: 20, opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32, delay: 0.04 }}
                >
                  <div className="bg-[hsl(var(--surface-2))] rounded-full p-1.5 flex items-center justify-around shadow-xl">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAction(() => onAddReaction(emoji))}
                        className="w-10 h-10 flex items-center justify-center text-2xl rounded-full hover:bg-foreground/10 active:scale-90 transition-transform"
                        aria-label={`Réagir avec ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    {onOpenEmojiPicker && (
                      <button
                        onClick={() => handleAction(onOpenEmojiPicker)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-foreground/10 text-foreground hover:bg-foreground/15"
                        aria-label="Plus d'émojis"
                      >
                        <SmilePlus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Action list */}
              <motion.div
                className="px-4 mt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] pointer-events-auto"
                initial={reduced ? { opacity: 1 } : { y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32, delay: 0.08 }}
              >
                <div className="bg-[hsl(var(--surface-2))] rounded-2xl py-1 shadow-xl">
                  <ActionRow icon={Reply} label="Répondre" onClick={() => handleAction(onReply)} />
                  {onCreateThread && (
                    <ActionRow icon={StreamlineThreads} label="Créer un fil" onClick={() => handleAction(onCreateThread)} />
                  )}
                  {isOwnMessage && onEdit && (
                    <ActionRow icon={Pencil} label="Modifier" onClick={() => handleAction(onEdit)} />
                  )}
                  {onPin && (
                    <ActionRow
                      icon={Pin}
                      label={isPinned ? 'Désépingler' : 'Épingler'}
                      onClick={() => handleAction(onPin)}
                    />
                  )}
                  {onCopyText && messageContent && (
                    <ActionRow icon={ClipboardCopy} label="Copier le texte" onClick={() => handleAction(onCopyText)} />
                  )}
                  <ActionRow icon={Link} label="Copier le lien" onClick={() => handleAction(onCopyLink)} />
                  <ActionRow icon={ClipboardCopy} label="Copier l'ID" onClick={() => handleAction(onCopyId)} />
                  {(isOwnMessage || canManageMessages) && onDelete && (
                    <>
                      <div className="h-px bg-border mx-3 my-1" />
                      <ActionRow
                        icon={Trash2}
                        label="Supprimer"
                        onClick={() => { close(); setDeleteOpen(true); }}
                        destructive
                      />
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteMessageDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => { onDelete?.(); setDeleteOpen(false); }}
      />
    </>,
    document.body
  );
}

function ActionRow({
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
        'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors min-h-[48px] text-left',
        destructive
          ? 'text-destructive active:bg-destructive/10'
          : 'text-foreground active:bg-foreground/10'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
    </button>
  );
}
