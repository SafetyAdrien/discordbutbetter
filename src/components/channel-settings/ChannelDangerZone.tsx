import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useDeleteChannel } from '@/hooks/useChannels';
import { toast } from 'sonner';

interface ChannelDangerZoneProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onDeleted: () => void;
}

export function ChannelDangerZone({ channelId, channelName, serverId, onDeleted }: ChannelDangerZoneProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const deleteChannel = useDeleteChannel();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const handleDelete = async () => {
    if (deleteChannel.isPending) return;
    try {
      await deleteChannel.mutateAsync({ channelId, serverId });
      onDeleted();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Global ENTER key listener when modal is open
  useEffect(() => {
    if (!showConfirm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !deleteChannel.isPending) {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showConfirm, deleteChannel.isPending]);

  // Focus cancel button on open for safety
  useEffect(() => {
    if (showConfirm && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [showConfirm]);

  return (
    <>
      <Separator className="my-6" />
      
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-semibold">Zone de danger</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          La suppression d'un salon est définitive. Tous les messages et fichiers partagés seront perdus.
        </p>

        <Button 
          variant="destructive" 
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer le salon
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-md">
          <button 
            onClick={() => setShowConfirm(false)}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le salon</AlertDialogTitle>
            <AlertDialogDescription>
              Tu es sûr(e) de vouloir supprimer <strong className="text-foreground">#{channelName}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
            <Button
              ref={cancelButtonRef}
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteChannel.isPending}
              className="flex-1"
            >
              {deleteChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer le salon
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
