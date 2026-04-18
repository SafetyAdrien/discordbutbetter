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
  onReply: () => void;
  onAddReaction: (emoji: string) => void;
  onCopyText: () => void;
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
      
      <button onClick={() => { onReply(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
        <Reply className="w-4 h-4 text-muted-foreground" /> Répondre
      </button>
      <button onClick={() => { onCopyText(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
        <Copy className="w-4 h-4 text-muted-foreground" /> Copier le texte
      </button>
      {onPin && (
        <button onClick={() => { onPin(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
          <Pin className="w-4 h-4 text-muted-foreground" /> {isPinned ? 'Désépingler' : 'Épingler'}
        </button>
      )}
      {onCreateThread && (
        <button onClick={() => { onCreateThread(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
          <StreamlineThreads className="w-4 h-4 text-muted-foreground" /> Créer un thread
        </button>
      )}
      <button onClick={() => { onCopyLink(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
        <Link className="w-4 h-4 text-muted-foreground" /> Copier le lien
      </button>
      <button onClick={() => { onCopyId(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
        <Hash className="w-4 h-4 text-muted-foreground" /> Copier l'ID
      </button>
      
      <div className="h-px bg-border my-1" />
      {isOwnMessage ? (
        <>
          {onEdit && (
            <button onClick={() => { onEdit(); onAction?.(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm">
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

  // Mobile: long press -> Sheet
  if (isMobile) {
    return (
      <>
        <div {...longPressHandlers}>
          {children}
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto p-4">
            {renderActions(() => setSheetOpen(false))}
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
          
          <ContextMenuItem onClick={onReply}>
            <Reply className="w-4 h-4 mr-2" />
            Répondre
          </ContextMenuItem>
          <ContextMenuItem onClick={onCopyText}>
            <Copy className="w-4 h-4 mr-2" />
            Copier le texte
          </ContextMenuItem>
          {onPin && (
            <ContextMenuItem onClick={onPin}>
              <Pin className="w-4 h-4 mr-2" />
              {isPinned ? 'Désépingler' : 'Épingler'}
            </ContextMenuItem>
          )}
          {onCreateThread && (
            <ContextMenuItem onClick={onCreateThread}>
              <StreamlineThreads className="w-4 h-4 mr-2" />
              Créer un thread
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={onCopyLink}>
            <Link className="w-4 h-4 mr-2" />
            Copier le lien
          </ContextMenuItem>
          <ContextMenuItem onClick={onCopyId}>
            <Hash className="w-4 h-4 mr-2" />
            Copier l'ID
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          {isOwnMessage ? (
            <>
              {onEdit && (
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
