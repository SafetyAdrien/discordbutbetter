import { CheckCircle, UserPlus, Settings, LogOut } from '@/components/icons/discord/lucide';
import { AdaptiveSheet } from '@/components/ui/adaptive-sheet';
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
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import { useLeaveServer } from '@/hooks/useLeaveServer';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { toast } from 'sonner';
import type { Server } from '@/types/app';

import { ChannelSheetIcon } from '@/components/icons/ChannelSheetIcon';
interface Props {
  server: Server | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
}

/** Long-press action sheet for a server icon — mirrors the desktop right-click menu in ServerList.tsx. */
export function MobileServerActionSheet({ server, open, onOpenChange, onOpenSettings }: Props) {
  const { user } = useAuth();
  const { hasPermission, isGod } = usePermissions(server?.id ?? null);
  const { markServerAsRead } = useServerUnreadCounts();
  const leaveServer = useLeaveServer();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  if (!server) return null;

  const canCreateInvite = isGod || hasPermission('administrator');
  const canOpenSettings = isGod || hasPermission('manage_server') || hasPermission('administrator');
  const isOwner = server.ownerId === user?.id;

  const close = () => onOpenChange(false);

  const handleMarkAsRead = () => {
    markServerAsRead(server.id);
    close();
  };

  const handleInvite = () => {
    const inviteLink = `${window.location.origin}/invite/${server.id}`;
    copyToClipboard(inviteLink, "Lien d'invitation copié");
    close();
  };

  const handleOpenSettings = () => {
    onOpenSettings?.();
    close();
  };

  const handleCopyId = () => {
    copyToClipboard(uuidToSnowflake(server.id), 'ID serveur copié');
    close();
  };

  const handleLeaveClick = () => {
    if (isOwner) {
      toast.error("Vous ne pouvez pas quitter un serveur dont vous êtes propriétaire");
      return;
    }
    setShowLeaveDialog(true);
  };

  const confirmLeave = () => {
    leaveServer.mutate(server.id, {
      onSuccess: () => {
        setShowLeaveDialog(false);
        close();
      },
    });
  };

  return (
    <>
      <AdaptiveSheet open={open} onOpenChange={onOpenChange} title={server.name}>
        <div className="p-2">
          <button type="button" onClick={handleMarkAsRead} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
            <CheckCircle className="w-4 h-4" />
            Marquer comme lu
          </button>
          {canCreateInvite && (
            <button type="button" onClick={handleInvite} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
              <UserPlus className="w-4 h-4" />
              Inviter des personnes
            </button>
          )}
          {canOpenSettings && (
            <button type="button" onClick={handleOpenSettings} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
              <Settings className="w-4 h-4" />
              Paramètres du serveur
            </button>
          )}
          <button type="button" onClick={handleCopyId} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
            <ChannelSheetIcon name="id" className="w-4 h-4" />
            Copier l'ID
          </button>
          {!isGod && (
            <button type="button" onClick={handleLeaveClick} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-destructive/10 rounded-md transition-colors text-sm text-destructive">
              <LogOut className="w-4 h-4" />
              Quitter le serveur
            </button>
          )}
        </div>
      </AdaptiveSheet>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter {server.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous ne pourrez plus accéder aux salons de ce serveur tant que vous ne l'aurez pas rejoint à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
