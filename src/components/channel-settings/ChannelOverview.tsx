import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { useUpdateChannel, type ChannelDetails } from '@/hooks/useChannelSettings';
import { useServerSettings } from '@/hooks/useServerSettings';
import { toast } from 'sonner';

function formatStrictChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u00C0-\u024F-_]/g, '');
}

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
  const [channelType, setChannelType] = useState<'text' | 'announcement'>(
    channel.type === 'announcement' ? 'announcement' : 'text'
  );
  const updateChannel = useUpdateChannel();
  const { data: serverSettings } = useServerSettings(channel.server_id);

  const isFlexible = serverSettings?.flexible_channel_names ?? true;
  const isExemptFromStrict = channel.type === 'voice' || channel.type === 'stage';
  const shouldFormatStrict = !isFlexible && !isExemptFromStrict;

  // Re-sync local state when channel prop changes
  useEffect(() => {
    setName(channel.name);
    setDescription(channel.description || '');
    setChannelType(channel.type === 'announcement' ? 'announcement' : 'text');
  }, [channel.id, channel.name, channel.description, channel.type]);

  const typeInfo = channelType ? channelTypeLabels[channelType] : channelTypeLabels.text;
  const TypeIcon = typeInfo.icon;

  const canToggleType = channel.type === 'text' || channel.type === 'announcement';

  const effectiveName = shouldFormatStrict ? formatStrictChannelName(name.trim()) : name.trim();

  const hasChanges = 
    effectiveName !== channel.name || 
    description !== (channel.description || '') ||
    (canToggleType && channelType !== channel.type);

  const handleTypeToggle = (isAnnouncement: boolean) => {
    setChannelType(isAnnouncement ? 'announcement' : 'text');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom du salon ne peut pas être vide');
      return;
    }

    try {
      const nameChanged = name !== channel.name;
      const finalName = (shouldFormatStrict && nameChanged) ? formatStrictChannelName(name.trim()) : name.trim();
      if (!finalName) {
        toast.error('Le nom du salon ne peut pas être vide');
        return;
      }

      await updateChannel.mutateAsync({
        channelId: channel.id,
        serverId: channel.server_id,
        name: finalName,
        description: description.trim() || null,
        type: canToggleType && channelType !== channel.type ? channelType : undefined,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="channel-name">Nom du salon</Label>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border shrink-0">
            <TypeIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <Input
            id="channel-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={shouldFormatStrict ? "nom-du-salon" : "Nom du salon"}
            maxLength={100}
            className="flex-1"
          />
        </div>
        {shouldFormatStrict && name !== formatStrictChannelName(name) && (
          <p className="text-xs text-muted-foreground">Les caractères spéciaux seront convertis à l'enregistrement.</p>
        )}
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

      {/* Toggle for text <-> announcement */}
      {canToggleType && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <StreamlineMegaphone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Salon d'annonces</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Les utilisateurs peuvent suivre ce salon et recevoir les messages dans leurs propres serveurs.
              </p>
            </div>
            <Switch
              checked={channelType === 'announcement'}
              onCheckedChange={handleTypeToggle}
            />
          </div>
        </div>
      )}

      {/* Show type badge for non-toggleable channels */}
      {!canToggleType && (
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
      )}

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
