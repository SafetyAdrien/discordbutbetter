import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
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

  const handleDelete = useCallback(async () => {
    if (deleteChannel.isPending) return;
    try {
      await deleteChannel.mutateAsync({ channelId, serverId });
      onDeleted();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  }, [channelId, serverId, deleteChannel, onDeleted]);

  // Keyboard handler for Enter key
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
  }, [showConfirm, handleDelete, deleteChannel.isPending]);

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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le salon</DialogTitle>
            <DialogDescription>
              Tu es sûr(e) de vouloir supprimer <strong className="text-foreground">#{channelName}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
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
              autoFocus
            >
              {deleteChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer le salon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
