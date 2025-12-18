import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  const [confirmText, setConfirmText] = useState('');
  const deleteChannel = useDeleteChannel();

  const canDelete = confirmText === channelName;

  const handleDelete = async () => {
    try {
      await deleteChannel.mutateAsync({ channelId, serverId });
      onDeleted();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Supprimer #{channelName} ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Cette action est <strong>irréversible</strong>. Tous les messages, fichiers et webhooks associés seront définitivement supprimés.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm-name">
                  Tapez <strong>{channelName}</strong> pour confirmer
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canDelete && !deleteChannel.isPending) {
                      e.preventDefault();
                      handleDelete();
                    }
                  }}
                  placeholder={channelName}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!canDelete || deleteChannel.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
