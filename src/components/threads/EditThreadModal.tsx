import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChannelPermissions } from '@/components/channel-settings/ChannelPermissions';
import { useUpdateThread, useLockThread, useCloseThread } from '@/hooks/useThreads';
import { Thread } from '@/types/thread';

interface EditThreadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thread: Thread;
  serverId: string;
}

export function EditThreadModal({ open, onOpenChange, thread, serverId }: EditThreadModalProps) {
  const [name, setName] = useState(thread.name);
  const [locked, setLocked] = useState(thread.locked || false);
  const [closed, setClosed] = useState(thread.closed || false);
  const updateThread = useUpdateThread();
  const lockThread = useLockThread();
  const closeThread = useCloseThread();

  useEffect(() => {
    if (open) {
      setName(thread.name);
      setLocked(thread.locked || false);
      setClosed(thread.closed || false);
    }
  }, [open, thread]);

  const handleSave = () => {
    if (name.trim() && name !== thread.name) {
      updateThread.mutate({ threadId: thread.id, name: name.trim() });
    }
    if (locked !== (thread.locked || false)) {
      lockThread.mutate({ threadId: thread.id, locked });
    }
    if (closed !== (thread.closed || false)) {
      closeThread.mutate({ threadId: thread.id, closed });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Modifier le fil</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Aperçu</TabsTrigger>
            <TabsTrigger value="permissions" className="flex-1">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="thread-name">Nom du fil</Label>
              <Input
                id="thread-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du fil"
                maxLength={100}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Verrouiller le fil</Label>
                <p className="text-xs text-muted-foreground">
                  Seuls les modérateurs pourront envoyer des messages
                </p>
              </div>
              <Switch checked={locked} onCheckedChange={setLocked} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Fermer le fil</Label>
                <p className="text-xs text-muted-foreground">
                  Bloque l'écriture et ferme le panneau
                </p>
              </div>
              <Switch checked={closed} onCheckedChange={setClosed} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={handleSave}>Enregistrer</Button>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <ChannelPermissions
              channelId={thread.channel_id}
              serverId={serverId}
              channelType="text"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
