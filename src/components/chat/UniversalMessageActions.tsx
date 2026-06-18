import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Reply, Pencil, Trash2, Link, Pin, SmilePlus, MoreHorizontal, ClipboardCopy } from 'lucide-react';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { cn } from '@/lib/utils';
import { DeleteMessageDialog } from './DeleteMessageDialog';

// Exactement 3 émojis les plus populaires pour le hover
const QUICK_REACTIONS = ['👍', '❤️', '😂'];

// Grille d'émojis pour le picker
const EMOJI_PICKER_GRID = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐'];
export interface UniversalMessageActionsProps {
  isVisible: boolean;
  isShiftPressed: boolean;
  isOwnMessage: boolean;
  isPinned?: boolean;
  onReply: () => void;
  onAddReaction?: (emoji: string) => void;
  onCopyLink: () => void;
  onCopyId: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateThread?: () => void;
  onPin?: () => void;
  onDropdownOpenChange?: (open: boolean) => void;
  customAction?: React.ReactNode;
  canAddReactions?: boolean;
  canManageMessages?: boolean;
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
  onEdit,
  onDelete,
  onCreateThread,
  onPin,
  onDropdownOpenChange,
  customAction,
  canAddReactions = true,
  canManageMessages = false
}: UniversalMessageActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!isVisible && !deleteOpen) return null;

  const canDeleteMessage = (isOwnMessage || canManageMessages) && onDelete;

  // Mode SHIFT : affiche des actions alternatives (administration/technique)
  const slotCls = "h-7 w-7 shrink-0 inline-flex items-center justify-center hover:bg-primary/10 rounded-full transition-colors";
  if (isShiftPressed) {
    return <>
      <div className="absolute top-0 right-0 -translate-y-1/2 flex items-center gap-0.5 bg-[hsl(var(--surface-3))] border border-border/50 rounded-2xl shadow-[var(--shadow-elevation-2)] p-1 z-10 animate-fade-in w-fit">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onCopyId} className={slotCls}>
              <ClipboardCopy className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Copier l'ID</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onCopyLink} className={slotCls}>
              <Link className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Copier le lien</TooltipContent>
        </Tooltip>
        
        {onPin && <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onPin} className={slotCls}>
                <Pin className={cn("w-4 h-4", isPinned ? "text-primary" : "text-muted-foreground")} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{isPinned ? 'Désépingler' : 'Épingler'}</TooltipContent>
          </Tooltip>}
        
        {isOwnMessage && onEdit && <Tooltip>
            <TooltipTrigger asChild>
               <button onClick={onEdit} className={slotCls}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Modifier</TooltipContent>
          </Tooltip>}
        
        {canDeleteMessage && <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onDelete?.()} className={cn(slotCls, "hover:bg-destructive/15")}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Supprimer</TooltipContent>
          </Tooltip>}
      </div>
    </>;
  }

  // Mode normal
  return <>
    {isVisible && (
      <div className="absolute top-0 right-0 -translate-y-1/2 flex items-center gap-0.5 border border-border/50 rounded-2xl shadow-[var(--shadow-elevation-2)] p-1 z-10 animate-fade-in bg-[hsl(var(--surface-3))] w-fit">
        {canAddReactions && onAddReaction && QUICK_REACTIONS.map(emoji => <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button onClick={() => onAddReaction(emoji)} className={cn(slotCls, "text-base leading-none")}>
                {emoji}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{emoji}</TooltipContent>
          </Tooltip>)}
        
        {canAddReactions && onAddReaction && (
          <Popover>
            <PopoverTrigger asChild>
               <button className={slotCls}>
                <SmilePlus className="w-4 h-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-64 p-2">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_PICKER_GRID.map(emoji => <button key={emoji} onClick={() => onAddReaction(emoji)} className="p-1 hover:bg-primary/10 rounded-full text-lg transition-colors">
                    {emoji}
                  </button>)}
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {customAction}
        
        {isOwnMessage && onEdit && <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onEdit} className={slotCls}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Modifier</TooltipContent>
          </Tooltip>}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onReply} className={slotCls}>
              <Reply className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Répondre</TooltipContent>
        </Tooltip>
        
        <DropdownMenu onOpenChange={onDropdownOpenChange}>
          <DropdownMenuTrigger asChild>
            <button className={slotCls}>
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onCreateThread && <DropdownMenuItem onClick={onCreateThread}>
                <StreamlineThreads className="w-4 h-4 mr-2" />
                Créer un thread
              </DropdownMenuItem>}
            {onPin && <DropdownMenuItem onClick={onPin}>
                <Pin className="w-4 h-4 mr-2" />
                {isPinned ? 'Désépingler' : 'Épingler'}
              </DropdownMenuItem>}
            <DropdownMenuItem onClick={onCopyLink}>
              <Link className="w-4 h-4 mr-2" />
              Copier le lien
            </DropdownMenuItem>
            {canDeleteMessage && <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}
    <DeleteMessageDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => { onDelete?.(); setDeleteOpen(false); }} />
  </>;
}
