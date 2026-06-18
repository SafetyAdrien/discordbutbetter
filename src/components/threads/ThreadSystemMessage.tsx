import React, { useState } from 'react';
import { Thread } from '@/types/thread';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ThreadSystemMessageProps {
  thread: Thread;
  onClick: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export function ThreadSystemMessage({
  thread,
  onClick,
  onRename,
  onDelete,
  canManage = false,
}: ThreadSystemMessageProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(thread.name);

  const messageCount = thread.message_count || 0;
  const lastMessage = thread.last_message;
  const relativeTime = thread.last_message_at
    ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: false, locale: fr })
    : thread.created_at
      ? formatDistanceToNow(new Date(thread.created_at), { addSuffix: false, locale: fr })
      : null;

  const handleRename = () => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== thread.name && onRename) {
      onRename(trimmed);
    }
    setRenameOpen(false);
  };

  const handleDeleteConfirm = () => {
    onDelete?.();
    setDeleteOpen(false);
  };

  const embedContent = (
    <button
      onClick={onClick}
      className="group/thread flex items-start gap-2 w-fit max-w-full text-left py-1.5 px-2 -mx-2 rounded-lg transition-colors bg-[hsl(var(--surface-3)/0.4)] hover:bg-[hsl(var(--surface-3)/0.7)]"
    >
      <StreamlineThreads className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary hover:underline">
            {thread.name}
          </span>
          <span className="text-xs flex items-center gap-1 text-foreground">
            {messageCount} {messageCount === 1 ? 'Message' : 'Messages'}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastMessage ? (
            <span className="truncate max-w-[200px]">
              {lastMessage.author?.display_name}: {lastMessage.content}
            </span>
          ) : (
            <span className="italic">
              Il n'y a pas de messages récents dans ce thread.
            </span>
          )}
          {relativeTime && (
            <>
              <span className="flex-shrink-0">•</span>
              <span className="flex-shrink-0">{relativeTime}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );

  const handleCopyId = () => {
    copyToClipboard(uuidToSnowflake(thread.id));
    toast.success('ID copié');
  };
  const handleCopyLink = () => {
    copyToClipboard(`${window.location.origin}/thread/${thread.id}`);
    toast.success('Lien copié');
  };

  return (
    <>
      <div onContextMenu={(e) => e.stopPropagation()}>
      <UniversalMessageContextMenu

        messageId={thread.id}
        isOwnMessage={false}
        canAddReactions={false}
        canManageMessages={canManage}
        variant="system"
        copyLinkLabel="Copier le lien du thread"
        copyIdLabel="Copier l'ID du thread"
        onAddReaction={() => {}}
        onCopyLink={handleCopyLink}
        onCopyId={handleCopyId}
        extraItems={
          canManage ? (
            <>
              <ContextMenuItem
                onClick={() => requestAnimationFrame(() => setRenameOpen(true))}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Modifier le nom
              </ContextMenuItem>
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => requestAnimationFrame(() => setDeleteOpen(true))}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer le Thread
              </ContextMenuItem>
            </>
          ) : undefined
        }
      >
        {embedContent}
      </UniversalMessageContextMenu>
      </div>



      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le nom du Thread</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du thread"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim() || newName.trim() === thread.name}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le Thread</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le thread « {thread.name} » ? Cette action est irréversible et supprimera tous les messages du thread.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ThreadSystemMessage;
