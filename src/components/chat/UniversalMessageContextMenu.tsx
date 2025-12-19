import { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Reply, Copy, Pin, Link, Hash, Pencil, Trash2, Flag, SmilePlus } from 'lucide-react';
import StreamlineThreads from '@/components/icons/StreamlineThreads';

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
  // Permission props
  canAddReactions?: boolean;
  canManageMessages?: boolean;
  // Callbacks
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
}

export function UniversalMessageContextMenu({
  children,
  isOwnMessage,
  isPinned = false,
  messageId,
  canAddReactions = true,
  canManageMessages = false,
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
}: UniversalMessageContextMenuProps) {
  // Can delete if own message OR has manage_messages permission
  const canDeleteMessage = isOwnMessage || canManageMessages;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[220px] p-1.5 rounded-lg shadow-xl" collisionPadding={8}>
        {/* Haut : Rangée d'émojis favoris - only if can add reactions */}
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
        
        {/* Milieu : Actions principales */}
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
        
        {/* Bas : Zone Danger */}
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
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                Supprimer
              </ContextMenuItem>
            )}
          </>
        ) : (
          <>
            {/* Moderators can delete other's messages */}
            {canManageMessages && onDelete && (
              <ContextMenuItem 
                className="text-destructive focus:text-destructive focus:bg-destructive/10" 
                onClick={onDelete}
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
  );
}
