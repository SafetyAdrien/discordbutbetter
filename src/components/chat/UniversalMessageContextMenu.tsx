import { ReactNode, useState } from 'react';
import { useShiftKey } from '@/hooks/useShiftKey';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Reply, Copy, Pin, Link, Hash, Pencil, Trash2, Flag, SmilePlus, Eye } from 'lucide-react';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLongPress } from '@/hooks/useLongPress';
import { DeleteMessageDialog } from './DeleteMessageDialog';
import { MessagePreviewSheet } from '@/components/mobile/MessagePreviewSheet';

// Émojis favoris pour le menu contextuel
const CONTEXT_MENU_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// Grille d'émojis pour le picker
const EMOJI_PICKER_GRID = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
];

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
  /** 'message' (default) shows all universal actions. 'poll' hides reply/copy text/create thread. 'system' hides reply/create thread/edit. */
  variant?: 'message' | 'poll' | 'system';
  /** Extra menu items injected after universal actions and before the danger zone. Receives a `close` helper for mobile sheet dismissal. */
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
  onViewReactions?: () => void;
  onClearAllReactions?: () => void;
}


export function UniversalMessageContextMenu({
  children,
  isOwnMessage,
  isPinned = false,
  messageId,
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
  onViewReactions,
  onClearAllReactions,
}: UniversalMessageContextMenuProps) {

  const { isMobile } = useBreakpoint();
  const isShiftPressed = useShiftKey();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDeleteMessage = isOwnMessage || canManageMessages;

  const longPressHandlers = useLongPress({
    onLongPress: () => setSheetOpen(true),
  });

  const handleDeleteClick = (e: React.MouseEvent, onAction?: () => void) => {
    onAction?.();
    if (e.shiftKey) {
      onDelete?.();
    } else {
      setDeleteOpen(true);
    }
  };

  const showReply = variant === 'message' && !!onReply;
  const showCopyText = variant !== 'poll' && !!onCopyText;
  const showCreateThread = variant === 'message' && !!onCreateThread;
  const showEdit = variant !== 'system' && !!onEdit;

  // Shared action items renderer
  const renderActions = (onAction?: () => void) => (
    <>
      {canAddReactions && (
        <div className="flex items-center gap-1 p-2 pb-3 border-b border-border mb-1">
          {CONTEXT_MENU_REACTIONS.map(emoji => (
            <button 
              key={emoji} 
              onClick={() => { onAddReaction(emoji); onAction?.(); }} 
              className="p-1.5 hover:bg-muted rounded text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      
      {showReply && (
        <button onClick={() => { onReply?.(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
          <Reply className="w-4 h-4 text-muted-foreground" /> Répondre
        </button>
      )}
      {showCopyText && (
        <button onClick={() => { onCopyText?.(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
          <Copy className="w-4 h-4 text-muted-foreground" /> Copier le texte
        </button>
      )}
      {onPin && (
        <button onClick={() => { onPin(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
          <Pin className="w-4 h-4 text-muted-foreground" /> {isPinned ? 'Désépingler' : 'Épingler'}
        </button>
      )}
      {showCreateThread && (
        <button onClick={() => { onCreateThread?.(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
          <StreamlineThreads className="w-4 h-4 text-muted-foreground" /> Créer un thread
        </button>
      )}
      <button onClick={() => { onCopyLink(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
        <Link className="w-4 h-4 text-muted-foreground" /> {copyLinkLabel ?? 'Copier le lien'}
      </button>
      <button onClick={() => { onCopyId(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
        <Hash className="w-4 h-4 text-muted-foreground" /> {copyIdLabel ?? "Copier l'ID"}
      </button>

      {hasReactions && onViewReactions && (
        <>
          <div className="h-px bg-border my-1" />
          <button onClick={() => { onViewReactions(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
            <Eye className="w-4 h-4 text-muted-foreground" /> Voir les réactions
          </button>
          {canManageReactions && onClearAllReactions && (
            <button onClick={() => { onClearAllReactions(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-destructive/10 rounded-md transition-colors text-sm text-destructive">
              <Trash2 className="w-4 h-4" /> Supprimer toutes les réactions
            </button>
          )}
        </>
      )}

      {/* extraItems are Radix ContextMenuItems → rendered only in desktop branch */}


      <div className="h-px bg-border my-1" />
      {isOwnMessage ? (
        <>
          {showEdit && (
            <button onClick={() => { onEdit?.(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
              <Pencil className="w-4 h-4 text-muted-foreground" /> Modifier
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => handleDeleteClick(e, onAction)} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-destructive/10 rounded-md transition-colors text-sm text-destructive">
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          )}
        </>
      ) : (
        <>
          {canManageMessages && onDelete && (
            <button onClick={(e) => handleDeleteClick(e, onAction)} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-destructive/10 rounded-md transition-colors text-sm text-destructive">
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          )}
          {onReport && (
            <button onClick={() => { onReport(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-destructive/10 rounded-md transition-colors text-sm text-destructive">
              <Flag className="w-4 h-4" /> Signaler
            </button>
          )}
        </>
      )}
    </>
  );


  const deleteDialog = (
    <DeleteMessageDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => { onDelete?.(); setDeleteOpen(false); }} />
  );

  // Mobile: long press -> bottom sheet rendering the same actions as desktop right-click
  if (isMobile) {
    return (
      <>
        <div {...longPressHandlers} style={{ touchAction: 'manipulation' }}>
          {children}
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="p-0 rounded-t-2xl border-t border-border bg-popover max-h-[85vh] overflow-y-auto"
          >
            <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
            {(previewAuthorName || previewContent) && (
              <div className="px-4 py-2 border-b border-border/40">
                {previewAuthorName && (
                  <div className="text-xs font-semibold text-foreground">{previewAuthorName}</div>
                )}
                {previewContent && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{previewContent}</div>
                )}
              </div>
            )}
            <div className="p-2">
              {renderActions(() => setSheetOpen(false))}
            </div>
          </SheetContent>
        </Sheet>
        {deleteDialog}
      </>
    );
  }


  // Desktop: context menu
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-[220px] p-1.5 rounded-lg shadow-xl" collisionPadding={8}>
          {canAddReactions && (
            <div className="flex items-center gap-1 p-1 pb-2 border-b border-border mb-1">
              {CONTEXT_MENU_REACTIONS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => onAddReaction(emoji)} 
                  className="p-1.5 hover:bg-muted rounded text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1.5 hover:bg-muted rounded transition-colors">
                    <SmilePlus className="w-5 h-5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-64 p-2">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_PICKER_GRID.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onAddReaction(emoji)}
                        className="p-1 hover:bg-muted rounded text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          {showReply && (
            <ContextMenuItem onClick={onReply}>
              <Reply className="w-4 h-4 mr-2" />
              Répondre
            </ContextMenuItem>
          )}
          {showCopyText && (
            <ContextMenuItem onClick={onCopyText}>
              <Copy className="w-4 h-4 mr-2" />
              Copier le texte
            </ContextMenuItem>
          )}
          {onPin && (
            <ContextMenuItem onClick={onPin}>
              <Pin className="w-4 h-4 mr-2" />
              {isPinned ? 'Désépingler' : 'Épingler'}
            </ContextMenuItem>
          )}
          {showCreateThread && (
            <ContextMenuItem onClick={onCreateThread}>
              <StreamlineThreads className="w-4 h-4 mr-2" />
              Créer un thread
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={onCopyLink}>
            <Link className="w-4 h-4 mr-2" />
            {copyLinkLabel ?? 'Copier le lien'}
          </ContextMenuItem>
          <ContextMenuItem onClick={onCopyId}>
            <Hash className="w-4 h-4 mr-2" />
            {copyIdLabel ?? "Copier l'ID"}
          </ContextMenuItem>

          {hasReactions && onViewReactions && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onViewReactions}>
                <Eye className="w-4 h-4 mr-2" />
                Voir les réactions
              </ContextMenuItem>
              {canManageReactions && onClearAllReactions && (
                <ContextMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={onClearAllReactions}
                >
                  <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                  Supprimer toutes les réactions
                </ContextMenuItem>
              )}
            </>
          )}

          {extraItems && (
            <>
              <ContextMenuSeparator />
              {extraItems}
            </>
          )}

          <ContextMenuSeparator />
          {isOwnMessage ? (
            <>
              {showEdit && (
                <ContextMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </ContextMenuItem>
              )}

              {onDelete && (
                <ContextMenuItem 
                  className="text-destructive focus:text-destructive focus:bg-destructive/10" 
                  onSelect={() => {
                    if (isShiftPressed) {
                      onDelete?.();
                    } else {
                      requestAnimationFrame(() => setDeleteOpen(true));
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                  Supprimer
                </ContextMenuItem>
              )}
            </>
          ) : (
            <>
              {canManageMessages && onDelete && (
                <ContextMenuItem 
                  className="text-destructive focus:text-destructive focus:bg-destructive/10" 
                  onSelect={() => {
                    if (isShiftPressed) {
                      onDelete?.();
                    } else {
                      requestAnimationFrame(() => setDeleteOpen(true));
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                  Supprimer
                </ContextMenuItem>
              )}
              {onReport && (
                <ContextMenuItem 
                  className="text-destructive focus:text-destructive focus:bg-destructive/10" 
                  onClick={onReport}
                >
                  <Flag className="w-4 h-4 mr-2 text-destructive" />
                  Signaler
                </ContextMenuItem>
              )}
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {deleteDialog}
    </>
  );
}
