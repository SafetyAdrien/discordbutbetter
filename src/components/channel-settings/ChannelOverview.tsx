import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { useUpdateChannel, type ChannelDetails } from '@/hooks/useChannelSettings';
import { supabase } from '@/integrations/supabase/client';
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
  const [channelType, setChannelType] = useState<'text' | 'announcement'>(
    channel.type === 'announcement' ? 'announcement' : 'text'
  );
  const [iconUrl, setIconUrl] = useState<string | null>(channel.icon_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateChannel = useUpdateChannel();

  const typeInfo = channelType ? channelTypeLabels[channelType] : channelTypeLabels.text;
  const TypeIcon = typeInfo.icon;

  // Can toggle between text and announcement only
  const canToggleType = channel.type === 'text' || channel.type === 'announcement';

  const hasChanges = 
    name !== channel.name || 
    description !== (channel.description || '') ||
    (canToggleType && channelType !== channel.type) ||
    iconUrl !== (channel.icon_url || null);

  const handleTypeToggle = (isAnnouncement: boolean) => {
    setChannelType(isAnnouncement ? 'announcement' : 'text');
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PNG, JPG, WEBP ou GIF.');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 1 Mo.');
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${channel.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('channel-icons')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('channel-icons')
        .getPublicUrl(path);

      setIconUrl(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload de l\'icône');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveIcon = () => {
    setIconUrl(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom du salon ne peut pas être vide');
      return;
    }

    try {
      await updateChannel.mutateAsync({
        channelId: channel.id,
        serverId: channel.server_id,
        name: name.trim(),
        description: description.trim() || undefined,
        type: canToggleType && channelType !== channel.type ? channelType : undefined,
        icon_url: iconUrl !== (channel.icon_url || null) ? iconUrl : undefined,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-4">
      {/* Channel Icon */}
      <div className="space-y-2">
        <Label>Icône du salon</Label>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {iconUrl ? (
                <img src={iconUrl} alt="Icône du salon" className="w-full h-full object-cover" />
              ) : (
                <TypeIcon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {iconUrl ? 'Modifier' : 'Importer'}
            </Button>
            {iconUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveIcon}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleIconUpload}
          />
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP ou GIF • Max 1 Mo</p>
      </div>

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
