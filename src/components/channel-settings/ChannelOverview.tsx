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
import { useServerSettings } from '@/hooks/useServerSettings';
import { supabase } from '@/integrations/supabase/client';
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
  const [iconUrl, setIconUrl] = useState<string | null>(channel.icon_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateChannel = useUpdateChannel();
  const { data: serverSettings } = useServerSettings(channel.server_id);

  const isFlexible = serverSettings?.flexible_channel_names ?? true;
  const shouldFormatStrict = !isFlexible && (channel.type === 'text' || channelType === 'text');

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
      <div className="space-y-2">
        <Label htmlFor="channel-name">Nom du salon</Label>
        <div className="flex items-center gap-3">
          {/* Clickable icon */}
          <div className="relative group shrink-0">
            <div
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border cursor-pointer transition-opacity"
              onClick={() => fileInputRef.current?.click()}
            >
              {iconUrl ? (
                <img src={iconUrl} alt="Icône du salon" className="w-full h-full object-cover" />
              ) : (
                <TypeIcon className="w-4 h-4 text-muted-foreground" />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-4 h-4 text-foreground" />
              </div>
            </div>
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}
            {iconUrl && !isUploading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemoveIcon(); }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleIconUpload}
            />
          </div>
          <Input
            id="channel-name"
            value={name}
            onChange={(e) => {
              const val = e.target.value;
              setName(shouldFormatStrict ? formatStrictChannelName(val) : val);
            }}
            placeholder={shouldFormatStrict ? "nom-du-salon" : "Nom du salon"}
            maxLength={100}
            className="flex-1"
          />
        </div>
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
