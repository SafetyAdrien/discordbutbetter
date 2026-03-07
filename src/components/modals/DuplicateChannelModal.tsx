import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
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
  onClose: () => void;
}

export function DuplicateChannelModal({ channelId, channelName, serverId, onClose }: DuplicateChannelModalProps) {
  const [name, setName] = useState(channelName);
  const [copyPermissions, setCopyPermissions] = useState(true);
  const duplicateChannel = useDuplicateChannel();

  const handleDuplicate = () => {
    if (!name.trim()) return;
    duplicateChannel.mutate(
      { channelId, serverId, name: name.trim(), copyPermissions },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <ResponsiveModal open onOpenChange={(open) => !open && onClose()} title="Dupliquer le salon">
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleDuplicate();
                }
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="copy-perms"
              checked={copyPermissions}
              onCheckedChange={(v) => setCopyPermissions(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="copy-perms" className="cursor-pointer font-medium">
                Copier les permissions existantes
              </Label>
              <p className="text-xs text-muted-foreground">
                Les surcharges de permissions (rôles) du salon original seront copiées dans le nouveau salon.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={handleDuplicate} disabled={duplicateChannel.isPending || !name.trim()}>
          {duplicateChannel.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          Dupliquer
        </Button>
      </div>
    </ResponsiveModal>
  );
}
