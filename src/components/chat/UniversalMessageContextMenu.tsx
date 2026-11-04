import { ReactNode, useState } from 'react';
import { useShiftKey } from '@/hooks/useShiftKey';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Eye, Flag, Trash2 } from '@/components/icons/discord/lucide';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLongPress } from '@/hooks/useLongPress';
import { DeleteMessageDialog } from './DeleteMessageDialog';
import { useUserSettingsValue } from '@/hooks/useUserSettings';
import { ReminderContextSubmenu } from '@/components/reminders/ReminderMenu';
import type { ReminderTarget } from '@/hooks/useReminders';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { useQuickReactions, recordReactionUsage } from '@/hooks/useFavoriteReactions';
import { useRecentEmojis } from '@/components/chat/emoji-picker/useRecentEmojis';
import { useEmojiShortcodes } from '@/hooks/useEmojiShortcodes';
import { MessageMenuOpenContext } from './message-menu/MessageMenuContext';
import { EmojiGlyph } from './message-menu/EmojiGlyph';
import {
  IconApps, IconBookmark, IconClock, IconCopyText, IconDictate, IconForward, IconId, IconLink, IconMarkUnread, IconPencil, IconPin,
  IconReply, IconSmile, IconTrash, IconUnpin,
} from './message-menu/MessageMenuIcons';
import { cn } from '@/lib/utils';

/*
 * Menu d'un message (video de reference) : quatre reactions rapides, "Ajouter une reaction" (sous-menu des emojis
 * recents + "Voir plus"), puis groupes separes par un filet : modifier / repondre / transferer / creer un fil ;
 * copier le texte, epingler, rappel, applications, non lu, lien, dicter ; supprimer ; identifiant.
 */

const FALLBACK_REACTIONS = ['👍', '🎉', '👀', '😂', '👋', '🔥', '❤️', '😮', '😢', '🙏'];

export interface UniversalMessageContextMenuProps {
  children: ReactNode;
  isOwnMessage: boolean;
  isPinned?: boolean;
  messageId: string;
  canAddReactions?: boolean;
  canManageMessages?: boolean;
  hasReactions?: boolean;
  canManageReactions?: boolean;
  /** Optional preview metadata used by the mobile long-press sheet. */
  previewAuthorName?: string;
  previewAuthorAvatar?: string;
  previewContent?: string;
  /** 'message' (default) shows all universal actions. 'poll' hides copy text/transfer. 'system' hides reply/create thread/edit. */
  variant?: 'message' | 'poll' | 'system';
  /** Extra menu items injected in the third group (e.g. "Clore le sondage maintenant"). */
  extraItems?: ReactNode;
  /** Labels overrides for ID/link copy entries (e.g. "Copier l'ID du sondage"). */
  copyIdLabel?: string;
  copyLinkLabel?: string;
  onReply?: () => void;
  onAddReaction: (emoji: string) => void;
  onCopyText?: () => void;
  onCopyLink: () => void;
  onCopyId: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateThread?: () => void;
  onPin?: () => void;
  onReport?: () => void;
  onForward?: () => void;
  onMarkUnread?: () => void;
  onViewReactions?: () => void;
  onClearAllReactions?: () => void;
  /** Cible du rappel ("Creer un rappel") ; absent = pas d'entree. */
  reminder?: ReminderTarget;
}

const ROW = 'h-9 min-h-9 gap-2 px-2 py-0 whitespace-nowrap text-sm leading-[18px] font-medium text-[#dbdee1] [&>svg:first-child]:shrink-0 [&>svg:last-child:not(:first-child)]:h-3.5 [&>svg:last-child:not(:first-child)]:w-3.5 [&>svg:last-child:not(:first-child)]:text-[#b5bac1]';
const ICON = 'w-5 h-5 text-[#b5bac1] shrink-0';
const DANGER = 'text-[#f57976] focus:text-[#f57976] data-[highlighted]:text-[#f57976] data-[highlighted]:bg-[#f57976]/[0.12] focus:bg-[#f57976]/[0.12]';
const SOON = 'opacity-60 cursor-not-allowed data-[highlighted]:bg-transparent focus:bg-transparent';
const SEP = '-mx-0 my-2 bg-white/[0.06]';

export function UniversalMessageContextMenu({
  children,
  isOwnMessage,
  isPinned = false,
  messageId: _messageId,
  canAddReactions = true,
  canManageMessages = false,
  hasReactions = false,
  canManageReactions = false,
  previewAuthorName,
  previewAuthorAvatar,
  previewContent,
  variant = 'message',
  extraItems,
  copyIdLabel,
  copyLinkLabel,
  onReply,
  onAddReaction,
  onCopyText,
  onCopyLink,
  onCopyId,
  onEdit,
  onDelete,
  onCreateThread,
  onPin,
  onReport,
  onForward,
  onMarkUnread,
  onViewReactions,
  onClearAllReactions,
  reminder,
}: UniversalMessageContextMenuProps) {
  const { isMobile } = useBreakpoint();
  // "Copier l'identifiant" n'apparait qu'en mode developpeur, comme Discord.
  const devMode = useUserSettingsValue().developer.dev_mode;
  const isShiftPressed = useShiftKey();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picker, setPicker] = useState<{ x: number; y: number } | null>(null);
  const quick = useQuickReactions();
  const { recent } = useRecentEmojis();
  const shortcode = useEmojiShortcodes();
  const canDeleteMessage = !!onDelete && (isOwnMessage || canManageMessages);

  const longPressHandlers = useLongPress({ onLongPress: () => setSheetOpen(true) });

  const showReply = variant !== 'system' && !!onReply;
  const showForward = variant === 'message' && !!onForward;
  const showCopyText = variant === 'message' && !!onCopyText;
  const showCreateThread = variant !== 'system' && !!onCreateThread;
  const showEdit = variant === 'message' && !!onEdit && isOwnMessage;

  const react = (emoji: string) => { recordReactionUsage(emoji); onAddReaction(emoji); };
  const requestDelete = (e?: { shiftKey?: boolean }) => {
    if (isShiftPressed || e?.shiftKey) onDelete?.();
    else requestAnimationFrame(() => setDeleteOpen(true));
  };

  const submenuEmojis = Array.from(new Set([...recent, ...FALLBACK_REACTIONS])).slice(0, 10);

  const deleteDialog = (
    <DeleteMessageDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => { onDelete?.(); setDeleteOpen(false); }} />
  );

  // Selecteur complet ("Voir plus") : ancre invisible a l'emplacement du menu.
  const pickerHost = picker && (
    <EmojiStickerPicker
      serverId={null}
      open
      onOpenChange={(o) => { if (!o) setPicker(null); }}
      onEmojiSelect={react}
      side="left"
      align="start"
      trigger={<span aria-hidden style={{ position: 'fixed', left: picker.x, top: picker.y, width: 1, height: 1 }} />}
    />
  );

  // Mobile: appui long -> feuille du bas avec les memes actions (liste a plat).
  if (isMobile) {
    const rowCls = 'flex items-center gap-3 w-full px-2 h-10 rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors';
    const done = () => setSheetOpen(false);
    const Item = ({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
      <button type="button" onClick={() => { onClick(); done(); }} className={cn(rowCls, danger && 'text-[#f57976]')}>{icon}{label}</button>
    );
    return (
      <>
        <div {...longPressHandlers} style={{ touchAction: 'manipulation' }}>{children}</div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="p-0 rounded-t-2xl border-t border-border bg-popover max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
            {(previewAuthorName || previewContent) && (
              <div className="px-4 py-2 border-b border-border/40">
                {previewAuthorName && <div className="text-xs font-semibold text-foreground">{previewAuthorName}</div>}
                {previewContent && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{previewContent}</div>}
              </div>
            )}
            <div className="p-2">
              {canAddReactions && (
                <div className="grid grid-cols-4 gap-2 p-1 pb-3">
                  {quick.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => { react(emoji); done(); }} className="h-11 rounded-lg bg-white/[0.05] text-2xl">{emoji}</button>
                  ))}
                </div>
              )}
              {showEdit && <Item icon={<IconPencil className={ICON} />} label="Modifier le message" onClick={() => onEdit?.()} />}
              {showReply && <Item icon={<IconReply className={ICON} />} label="Répondre" onClick={() => onReply?.()} />}
              {showForward && <Item icon={<IconForward className={ICON} />} label="Transférer" onClick={() => onForward?.()} />}
              {showCreateThread && <Item icon={<StreamlineThreads className={ICON} />} label="Créer un fil" onClick={() => onCreateThread?.()} />}
              {showCopyText && <Item icon={<IconCopyText className={ICON} />} label="Copier le texte" onClick={() => onCopyText?.()} />}
              {onPin && <Item icon={isPinned ? <IconUnpin className={ICON} /> : <IconPin className={ICON} />} label={isPinned ? 'Désépingler le message' : 'Épingler le message'} onClick={() => onPin()} />}
              {onMarkUnread && <Item icon={<IconMarkUnread className={ICON} />} label="Marquer comme non lu" onClick={() => onMarkUnread()} />}
              <Item icon={<IconLink className={ICON} />} label={copyLinkLabel ?? 'Copier le lien du message'} onClick={onCopyLink} />
              {hasReactions && onViewReactions && <Item icon={<Eye className={ICON} />} label="Voir les réactions" onClick={onViewReactions} />}
              {hasReactions && canManageReactions && onClearAllReactions && <Item danger icon={<Trash2 className="w-5 h-5" />} label="Supprimer toutes les réactions" onClick={onClearAllReactions} />}
              {canDeleteMessage && <Item danger icon={<IconTrash className="w-5 h-5" />} label="Supprimer le message" onClick={() => setDeleteOpen(true)} />}
              {!isOwnMessage && onReport && <Item danger icon={<Flag className="w-5 h-5" />} label="Signaler le message" onClick={onReport} />}
              {devMode && <Item icon={<IconId className={ICON} />} label={copyIdLabel ?? "Copier l'identifiant du message"} onClick={onCopyId} />}
            </div>
          </SheetContent>
        </Sheet>
        {deleteDialog}
        {pickerHost}
      </>
    );
  }

  const group1 = showEdit || showReply || showForward || showCreateThread;
  const hasReactionsGroup = hasReactions && !!onViewReactions;
  const hasDangerGroup = canDeleteMessage || (!isOwnMessage && !!onReport) || (hasReactionsGroup && canManageReactions && !!onClearAllReactions);

  // Desktop: menu contextuel
  return (
    <MessageMenuOpenContext.Provider value={menuOpen}>
      <ContextMenu onOpenChange={setMenuOpen}>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-[246px] min-w-[246px] p-2 rounded-lg" collisionPadding={8}>
          {canAddReactions && (
            <>
              <div className="flex justify-center gap-2.5 pt-2 pb-1">
                {quick.map((emoji) => (
                  <ContextMenuItem
                    key={emoji}
                    aria-label={`Réagir avec ${emoji}`}
                    onSelect={() => react(emoji)}
                    className="h-11 min-h-11 w-11 justify-center p-0 rounded-[10px] bg-white/[0.04] text-[22px] leading-none data-[highlighted]:bg-white/[0.1] focus:bg-white/[0.1]"
                  >
                    <EmojiGlyph emoji={emoji} className="text-[22px]" />
                  </ContextMenuItem>
                ))}
              </div>
              <ContextMenuSub>
                <ContextMenuSubTrigger className={cn(ROW, 'mt-2')}>
                  <IconSmile className={ICON} />
                  Ajouter une réaction
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-[256px] p-2 max-h-[min(360px,var(--radix-context-menu-content-available-height))] overflow-y-auto scrollbar-thin" collisionPadding={8}>
                  {submenuEmojis.map((emoji) => (
                    <ContextMenuItem key={emoji} onSelect={() => react(emoji)} className={cn(ROW, 'h-9 min-h-9')}>
                      <EmojiGlyph emoji={emoji} className="w-6 text-center text-xl shrink-0" />
                      <span translate="no" className="truncate">{shortcode(emoji)}</span>
                    </ContextMenuItem>
                  ))}
                  <ContextMenuItem
                    className={cn(ROW, 'h-9 min-h-9')}
                    onSelect={(e) => {
                      const el = (e.target as HTMLElement | null)?.getBoundingClientRect();
                      setPicker({ x: el ? el.left : window.innerWidth / 2, y: el ? el.top : window.innerHeight / 2 });
                    }}
                  >
                    <IconSmile className={ICON} />
                    Voir plus
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator className={SEP} />
            </>
          )}

          {group1 && (
            <>
              {showEdit && <ContextMenuItem onSelect={() => onEdit?.()} className={ROW}><IconPencil className={ICON} />Modifier le message</ContextMenuItem>}
              {showReply && <ContextMenuItem onSelect={() => onReply?.()} className={ROW}><IconReply className={ICON} />Répondre</ContextMenuItem>}
              {showForward && <ContextMenuItem onSelect={() => onForward?.()} className={ROW}><IconForward className={ICON} />Transférer</ContextMenuItem>}
              {showCreateThread && <ContextMenuItem onSelect={() => onCreateThread?.()} className={ROW}><StreamlineThreads className={ICON} />Créer un fil</ContextMenuItem>}
              <ContextMenuSeparator className={SEP} />
            </>
          )}

          {(
            <>
              {showCopyText && <ContextMenuItem onSelect={() => onCopyText?.()} className={ROW}><IconCopyText className={ICON} />Copier le texte</ContextMenuItem>}
              {onPin && (
                <ContextMenuItem onSelect={() => onPin()} className={ROW}>
                  {isPinned ? <IconUnpin className={ICON} /> : <IconPin className={ICON} />}
                  {isPinned ? 'Désépingler le message' : 'Épingler le message'}
                </ContextMenuItem>
              )}
              {variant === 'poll' && (
                <ContextMenuItem disabled title="Bientôt disponible" className={cn(ROW, SOON)}><IconBookmark className={ICON} />Marquer un message</ContextMenuItem>
              )}
              {reminder && variant !== 'system' && <ReminderContextSubmenu target={reminder} triggerClassName={ROW} icon={<IconClock className={ICON} />} />}
              {variant !== 'system' && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger disabled title="Bientôt disponible" className={cn(ROW, SOON)}><IconApps className={ICON} />Applications</ContextMenuSubTrigger>
                </ContextMenuSub>
              )}
              {onMarkUnread && <ContextMenuItem onSelect={() => onMarkUnread()} className={ROW}><IconMarkUnread className={ICON} />Marquer comme non lu</ContextMenuItem>}
              <ContextMenuItem onSelect={() => onCopyLink()} className={ROW}><IconLink className={ICON} />{copyLinkLabel ?? 'Copier le lien du message'}</ContextMenuItem>
              {variant === 'message' && (
                <ContextMenuItem disabled title="Bientôt disponible" className={cn(ROW, SOON)}><IconDictate className={ICON} />Dicter le message</ContextMenuItem>
              )}
              {extraItems}
            </>
          )}

          {hasReactionsGroup && (
            <>
              <ContextMenuSeparator className={SEP} />
              <ContextMenuItem onSelect={() => onViewReactions?.()} className={ROW}><Eye className={ICON} />Voir les réactions</ContextMenuItem>
              {canManageReactions && onClearAllReactions && (
                <ContextMenuItem onSelect={() => onClearAllReactions()} className={cn(ROW, DANGER)}><Trash2 className="w-5 h-5 shrink-0" />Supprimer toutes les réactions</ContextMenuItem>
              )}
            </>
          )}

          {hasDangerGroup && (
            <>
              <ContextMenuSeparator className={SEP} />
              {canDeleteMessage && (
                <ContextMenuItem onSelect={() => requestDelete()} className={cn(ROW, DANGER)}><IconTrash className="w-5 h-5 shrink-0" />Supprimer le message</ContextMenuItem>
              )}
              {!isOwnMessage && onReport && (
                <ContextMenuItem onSelect={() => onReport()} className={cn(ROW, DANGER)}><Flag className="w-5 h-5 shrink-0" />Signaler le message</ContextMenuItem>
              )}
            </>
          )}

          {devMode && (
            <>
              <ContextMenuSeparator className={SEP} />
              <ContextMenuItem onSelect={() => onCopyId()} className={ROW}><IconId className={ICON} />{copyIdLabel ?? "Copier l'identifiant du message"}</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {deleteDialog}
      {pickerHost}
    </MessageMenuOpenContext.Provider>
  );
}
