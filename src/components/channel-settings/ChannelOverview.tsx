import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { useUpdateChannel, type ChannelDetails } from '@/hooks/useChannelSettings';
import { toast } from 'sonner';

interface ChannelOverviewProps {
  channel: ChannelDetails;
}

const channelTypeLabels = {
  text: { label: 'Textuel', icon: StreamlineHash },
  voice: { label: 'Vocal', icon: StreamlineVoice },
  forum: { label: 'Forum', icon: StreamlineForum },
  announcement: { label: 'Annonces', icon: StreamlineMegaphone },
  media: { label: 'Médias', icon: StreamlineMedia },
  calendar: { label: 'Calendrier', icon: StreamlineCalendar },
  tasks: { label: 'Tâches', icon: StreamlineTasks },
};

export function ChannelOverview({ channel }: ChannelOverviewProps) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const updateChannel = useUpdateChannel();

  const typeInfo = channel.type ? channelTypeLabels[channel.type] : channelTypeLabels.text;
  const TypeIcon = typeInfo.icon;

  const hasChanges = name !== channel.name || description !== (channel.description || '');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom du salon ne peut pas être vide');
      return;
    }

    try {
      await updateChannel.mutateAsync({
        channelId: channel.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Salon mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="channel-name">Nom du salon</Label>
        <Input
          id="channel-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nom-du-salon"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel-description">Description</Label>
        <Textarea
          id="channel-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez le but de ce salon..."
          rows={3}
          maxLength={1024}
        />
        <p className="text-xs text-muted-foreground">{description.length}/1024</p>
      </div>

      <div className="space-y-2">
        <Label>Type de salon</Label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <TypeIcon className="w-3 h-3" />
            {typeInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground">(non modifiable)</span>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateChannel.isPending}>
            {updateChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}
