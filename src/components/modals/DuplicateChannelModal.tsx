import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Copy } from 'lucide-react';
import { useDuplicateChannel } from '@/hooks/useChannels';

interface DuplicateChannelModalProps {
  channelId: string;
  channelName: string;
  serverId: string;
  open: boolean;
  onClose: () => void;
}

export function DuplicateChannelModal({ channelId, channelName, serverId, open, onClose }: DuplicateChannelModalProps) {
  const [name, setName] = useState(channelName);
  const [copyPermissions, setCopyPermissions] = useState(true);
  const duplicateChannel = useDuplicateChannel();

  const handleConfirm = () => {
    if (!name.trim()) return;
    duplicateChannel.mutate(
      { channelId, serverId, customName: name.trim(), copyPermissions },
      { onSuccess: () => onClose() }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-muted-foreground" />
            Dupliquer le salon
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dup-name">Nom du salon</Label>
              <Input
                id="dup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du salon"
                maxLength={100}
                autoFocus
              />
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox
                id="copy-perms"
                checked={copyPermissions}
                onCheckedChange={(checked) => setCopyPermissions(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="copy-perms" className="font-medium cursor-pointer">
                  Copier les permissions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les permissions du salon original seront appliquées au nouveau salon.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={!name.trim() || duplicateChannel.isPending}>
            {duplicateChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Dupliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
