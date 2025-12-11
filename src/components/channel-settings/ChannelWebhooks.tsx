import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Plus, Copy, Trash2, Loader2, Webhook } from 'lucide-react';
import { useChannelWebhooks, useCreateWebhook, useDeleteWebhook } from '@/hooks/useWebhooks';
import { toast } from 'sonner';

interface ChannelWebhooksProps {
  channelId: string;
}

export function ChannelWebhooks({ channelId }: ChannelWebhooksProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: webhooks, isLoading } = useChannelWebhooks(channelId);
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Le nom du webhook est requis');
      return;
    }

    try {
      await createWebhook.mutateAsync({
        channelId,
        name: newName.trim(),
      });
      setNewName('');
      setShowCreate(false);
      toast.success('Webhook créé');
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteWebhook.mutateAsync({ webhookId: deleteId, channelId });
      setDeleteId(null);
      toast.success('Webhook supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/api/webhooks/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiée');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            Créez des webhooks pour envoyer des messages automatisés
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Créer
        </Button>
      </div>

      {showCreate && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="space-y-2">
            <Label htmlFor="webhook-name">Nom du webhook</Label>
            <Input
              id="webhook-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Mon webhook"
              maxLength={80}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createWebhook.isPending}>
              {createWebhook.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {webhooks && webhooks.length > 0 ? (
        <div className="space-y-2">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={webhook.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20">
                  <Webhook className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{webhook.name}</p>
                <p className="text-xs text-muted-foreground">
                  ID: {webhook.id.slice(0, 8)}...
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyUrl(webhook.token)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteId(webhook.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Webhook className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Aucun webhook configuré</p>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le webhook ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les services utilisant ce webhook ne pourront plus envoyer de messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
