import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Hash, Volume2, MessageSquare, Megaphone, Loader2 } from 'lucide-react';
import { useUpdateChannel, type ChannelDetails } from '@/hooks/useChannelSettings';
import { toast } from 'sonner';

interface ChannelOverviewProps {
  channel: ChannelDetails;
}

const channelTypeLabels = {
  text: { label: 'Textuel', icon: Hash },
  voice: { label: 'Vocal', icon: Volume2 },
  forum: { label: 'Forum', icon: MessageSquare },
  announcement: { label: 'Annonces', icon: Megaphone },
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
