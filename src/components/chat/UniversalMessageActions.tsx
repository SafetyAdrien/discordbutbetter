import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { ReminderTarget } from '@/hooks/useReminders';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { MoreHorizontal } from '@/components/icons/discord/lucide';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { cn } from '@/lib/utils';
import { DeleteMessageDialog } from './DeleteMessageDialog';
import { useQuickReactions, recordReactionUsage } from '@/hooks/useFavoriteReactions';
import { useMessageMenuOpen } from './message-menu/MessageMenuContext';
import { emojiShortcode } from '@/lib/emojiNames';
import { emojiToken } from '@/lib/customEmoji';
import { EmojiGlyph } from './message-menu/EmojiGlyph';
import {
  IconBookmark, IconForward, IconId, IconLink, IconMarkUnread, IconPencil, IconPin, IconReply, IconSmile, IconTrash, IconUnpin,
} from './message-menu/MessageMenuIcons';

/*
 * Barre de survol d'un message (video de reference) : trois reactions favorites, un filet, puis
 * "Ajouter une reaction", "Modifier" (ou "Repondre" sur un message qui n'est pas le sien), "Transferer",
 * "Creer un fil" et "Plus". Maintenir Maj affiche les actions avancees (identifiant, lien, non lu, marque-page,
 * epingle, ..., supprimer).
 */

export interface UniversalMessageActionsProps {
  isVisible: boolean;
  isShiftPressed: boolean;
  isOwnMessage: boolean;
  isPinned?: boolean;
  /** Absent (ex. sondage) : pas de bouton "Repondre". */
  onReply?: () => void;
  onAddReaction?: (emoji: string) => void;
  onCopyLink: () => void;
  onCopyId: () => void;
  onCopyText?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateThread?: () => void;
  onPin?: () => void;
  onForward?: () => void;
  onMarkUnread?: () => void;
  onDropdownOpenChange?: (open: boolean) => void;
  customAction?: ReactNode;
  canAddReactions?: boolean;
  canManageMessages?: boolean;
  reminder?: ReminderTarget;
}

const SLOT = 'h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-[#b5bac1] hover:bg-white/[0.08] hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#5b63e4]';
const BAR = 'absolute top-0 right-7 -translate-y-1/2 z-10 flex items-center p-0.5 w-fit rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.24)]';

/** Bouton a infobulle utilisable comme declencheur Radix (la ref et les props de la Slot lui sont transmises). */
const TipButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(({ label, ...props }, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button ref={ref} type="button" aria-label={label} {...props} />
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
));
TipButton.displayName = 'TipButton';

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function UniversalMessageActions({
  isVisible,
  isShiftPressed,
  isOwnMessage,
  isPinned = false,
  onReply,
  onAddReaction,
  onCopyLink,
  onCopyId,
  onCopyText,
  onEdit,
  onDelete,
  onCreateThread,
  onPin,
  onForward,
  onMarkUnread,
  onDropdownOpenChange,
  customAction,
  canAddReactions = true,
  canManageMessages = false,
  reminder,
}: UniversalMessageActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuOpen = useMessageMenuOpen();
  const quick = useQuickReactions();

  if (!isVisible && !menuOpen && !deleteOpen) return null;

  const canDeleteMessage = !!onDelete && (isOwnMessage || canManageMessages);
  const react = (emoji: string) => { recordReactionUsage(emoji); onAddReaction?.(emoji); };
  const reactionsEnabled = canAddReactions && !!onAddReaction;

  const addReaction = reactionsEnabled && (
    <EmojiStickerPicker
      serverId={null}
      onEmojiSelect={(e, custom) => react(custom ? emojiToken(custom) : e)}
      side="bottom"
      trigger={<TipButton label="Ajouter une réaction" className={SLOT}><IconSmile className="w-5 h-5" /></TipButton>}
    />
  );
  const edit = isOwnMessage && onEdit && (
    <Tip label="Modifier"><button type="button" aria-label="Modifier" onClick={onEdit} className={SLOT}><IconPencil className="w-5 h-5" /></button></Tip>
  );
  const reply = onReply && (
    <Tip label="Répondre"><button type="button" aria-label="Répondre" onClick={onReply} className={SLOT}><IconReply className="w-5 h-5" /></button></Tip>
  );
  const replyOrEdit = <>{edit}{reply}</>;
  const forward = onForward && (
    <Tip label="Transférer"><button type="button" aria-label="Transférer" onClick={onForward} className={SLOT}><IconForward className="w-5 h-5" /></button></Tip>
  );
  const thread = onCreateThread && (
    <Tip label="Créer un fil"><button type="button" aria-label="Créer un fil" onClick={onCreateThread} className={SLOT}><StreamlineThreads className="w-5 h-5" /></button></Tip>
  );

  // Maj : actions avancees.
  if (isShiftPressed) {
    return (
      <>
        <div className={BAR} data-menu-open={menuOpen || undefined}>
          <Tip label="Copier l'identifiant du message"><button type="button" aria-label="Copier l'identifiant du message" onClick={onCopyId} className={SLOT}><IconId className="w-5 h-5" /></button></Tip>
          <Tip label="Copier le lien du message"><button type="button" aria-label="Copier le lien du message" onClick={onCopyLink} className={SLOT}><IconLink className="w-5 h-5" /></button></Tip>
          {onMarkUnread && <Tip label="Marquer comme non lu"><button type="button" aria-label="Marquer comme non lu" onClick={onMarkUnread} className={SLOT}><IconMarkUnread className="w-5 h-5" /></button></Tip>}
          <Tip label="Bientôt disponible"><button type="button" aria-label="Marquer un message (bientôt disponible)" aria-disabled className={cn(SLOT, 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-[#b5bac1]')}><IconBookmark className="w-5 h-5" /></button></Tip>
          {onPin && (
            <Tip label={isPinned ? 'Désépingler le message' : 'Épingler le message'}>
              <button type="button" aria-label={isPinned ? 'Désépingler le message' : 'Épingler le message'} onClick={onPin} className={SLOT}>
                {isPinned ? <IconUnpin className="w-5 h-5" /> : <IconPin className="w-5 h-5" />}
              </button>
            </Tip>
          )}
          {addReaction}
          {replyOrEdit}
          {forward}
          {thread}
          {canDeleteMessage && (
            <Tip label="Supprimer le message">
              <button type="button" aria-label="Supprimer le message" onClick={() => onDelete?.()} className={cn(SLOT, 'text-[#f57976] hover:text-[#f57976] hover:bg-[#f57976]/15')}><IconTrash className="w-5 h-5" /></button>
            </Tip>
          )}
        </div>
        <DeleteMessageDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => { onDelete?.(); setDeleteOpen(false); }} />
      </>
    );
  }

  return (
    <>
      <div className={BAR} data-menu-open={menuOpen || undefined}>
        {reactionsEnabled && (
          <>
            {quick.slice(1).map((emoji) => (
              <Tooltip key={emoji}>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Réagir" onClick={() => react(emoji)} className={cn(SLOT, 'text-xl leading-none hover:text-inherit')}>
                    <EmojiGlyph emoji={emoji} className="text-[20px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-center">
                  <div translate="no" className="font-medium">{emojiShortcode(emoji)}</div>
                  <div className="font-normal">Clique pour réagir</div>
                </TooltipContent>
              </Tooltip>
            ))}
            <span aria-hidden className="mx-1 h-6 w-px bg-white/[0.08]" />
          </>
        )}
        {addReaction}
        {customAction}
        {replyOrEdit}
        {forward}
        {thread}
        <Tip label="Plus">
          <button
            type="button"
            aria-label="Plus"
            className={SLOT}
            onClick={(e) => {
              // Ouvre le menu du message (le meme que le clic droit) sous le bouton.
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.right, clientY: r.bottom + 4 }));
            }}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </Tip>
      </div>
      <DeleteMessageDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => { onDelete?.(); setDeleteOpen(false); }} />
    </>
  );
}
