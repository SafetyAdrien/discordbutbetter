import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { StreamlineLink } from '@/components/icons/StreamlineLink';
import { Badge } from '@/components/ui/badge';
import { useDuplicateChannel, ChannelType } from '@/hooks/useChannels';

interface DuplicateChannelModalProps {
  open: boolean;
  onClose: () => void;
  channel: {
    id: string;
    name: string;
    type: ChannelType;
  };
  serverId: string;
}

const channelTypeLabels: Record<string, { label: string; icon: React.ElementType }> = {
  text: { label: 'Textuel', icon: StreamlineHash },
  voice: { label: 'Vocal', icon: StreamlineVoice },
  forum: { label: 'Forum', icon: StreamlineForum },
  announcement: { label: 'Annonces', icon: StreamlineMegaphone },
  media: { label: 'Médias', icon: StreamlineMedia },
  calendar: { label: 'Calendrier', icon: StreamlineCalendar },
  tasks: { label: 'Tâches', icon: StreamlineTasks },
  stage: { label: 'Stage', icon: StreamlineStage },
  link: { label: 'Lien', icon: StreamlineLink },
};

export function DuplicateChannelModal({ open, onClose, channel, serverId }: DuplicateChannelModalProps) {
  const [name, setName] = useState(channel.name);
  const [copyPermissions, setCopyPermissions] = useState(true);
  const duplicateChannel = useDuplicateChannel();

  useEffect(() => {
    if (open) {
      setName(channel.name);
      setCopyPermissions(true);
    }
  }, [open, channel.name]);

  const typeInfo = channelTypeLabels[channel.type] || channelTypeLabels.text;
  const TypeIcon = typeInfo.icon;

  const handleDuplicate = () => {
    duplicateChannel.mutate(
      {
        channelId: channel.id,
        serverId,
        customName: name.trim() || undefined,
        copyPermissions,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-muted-foreground" />
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border shrink-0">
                  <TypeIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  id="dup-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du salon"
                  maxLength={100}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDuplicate();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type :</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                {typeInfo.label}
              </Badge>
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
                <Label htmlFor="copy-perms" className="text-sm font-medium cursor-pointer">
                  Copier les permissions
                </Label>
                <p className="text-xs text-muted-foreground">
                  Duplique les permissions du salon original vers le nouveau salon.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleDuplicate} disabled={duplicateChannel.isPending || !name.trim()}>
            {duplicateChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Dupliquer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
