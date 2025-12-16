import { useState, useEffect } from 'react';
import { Heart, MessageSquare, Users, TrendingUp, Loader2, Hash } from 'lucide-react';
import { useEngagementStats } from '@/hooks/useEngagementStats';
import { useServerSettings, useUpdateServerSettings, ServerSettings } from '@/hooks/useServerSettings';
import { useChannels } from '@/hooks/useChannels';
import { useServerRoles } from '@/hooks/useRoles';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EngagementSettingsProps {
  serverId: string;
}

interface SettingToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  channelSelector?: React.ReactNode;
}

function SettingToggle({ title, description, checked, onCheckedChange, disabled, channelSelector }: SettingToggleProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <Label className="text-sm font-medium cursor-pointer">{title}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
      {checked && channelSelector && (
        <div className="pt-2 border-t border-border/50">
          {channelSelector}
        </div>
      )}
    </div>
  );
}

interface ChannelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  channels: { id: string; name: string }[];
  label: string;
}

function ChannelSelector({ value, onChange, channels, label }: ChannelSelectorProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
        <SelectTrigger className="bg-background h-8 text-sm">
          <SelectValue placeholder="Sélectionner un canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucun (utiliser le canal système)</SelectItem>
          {channels.map(channel => (
            <SelectItem key={channel.id} value={channel.id}>
              <div className="flex items-center gap-2">
                <Hash className="w-3 h-3 text-muted-foreground" />
                {channel.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EngagementSettings({ serverId }: EngagementSettingsProps) {
  const { data: stats, isLoading: statsLoading } = useEngagementStats(serverId);
  const { data: settings, isLoading: settingsLoading } = useServerSettings(serverId);
  const { data: channelsData } = useChannels(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const updateSettings = useUpdateServerSettings();

  // Local state for all settings
  const [localSettings, setLocalSettings] = useState<Partial<ServerSettings>>({
    welcome_message: '',
    welcome_channel_id: '',
    system_channel_id: '',
    sticker_channel_id: '',
    boost_channel_id: '',
    tips_channel_id: '',
    activity_channel_id: '',
    system_messages_enabled: true,
    sticker_reply_enabled: true,
    boost_message_enabled: true,
    setup_tips_enabled: true,
    activity_feed_enabled: true,
    auto_assign_roles: [],
  });

  // Get all text channels
  const textChannels = channelsData?.categories?.flatMap(cat => 
    cat.channels.filter(ch => ch.type === 'text')
  ) || [];

  // Get non-default roles
  const assignableRoles = roles.filter(r => !r.is_default);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        welcome_message: settings.welcome_message || '',
        welcome_channel_id: settings.welcome_channel_id || '',
        system_channel_id: settings.system_channel_id || '',
        sticker_channel_id: settings.sticker_channel_id || '',
        boost_channel_id: settings.boost_channel_id || '',
        tips_channel_id: settings.tips_channel_id || '',
        activity_channel_id: settings.activity_channel_id || '',
        system_messages_enabled: settings.system_messages_enabled ?? true,
        sticker_reply_enabled: settings.sticker_reply_enabled ?? true,
        boost_message_enabled: settings.boost_message_enabled ?? true,
        setup_tips_enabled: settings.setup_tips_enabled ?? true,
        activity_feed_enabled: settings.activity_feed_enabled ?? true,
        auto_assign_roles: settings.auto_assign_roles || [],
      });
    }
  }, [settings]);

  const updateLocalSetting = <K extends keyof ServerSettings>(key: K, value: ServerSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate({
      serverId,
      settings: {
        welcome_message: localSettings.welcome_message || null,
        welcome_channel_id: localSettings.welcome_channel_id || null,
        system_channel_id: localSettings.system_channel_id || null,
        sticker_channel_id: localSettings.sticker_channel_id || null,
        boost_channel_id: localSettings.boost_channel_id || null,
        tips_channel_id: localSettings.tips_channel_id || null,
        activity_channel_id: localSettings.activity_channel_id || null,
        system_messages_enabled: localSettings.system_messages_enabled,
        sticker_reply_enabled: localSettings.sticker_reply_enabled,
        boost_message_enabled: localSettings.boost_message_enabled,
        setup_tips_enabled: localSettings.setup_tips_enabled,
        activity_feed_enabled: localSettings.activity_feed_enabled,
        auto_assign_roles: localSettings.auto_assign_roles,
      },
    });
  };

  const toggleRole = (roleId: string) => {
    const currentRoles = localSettings.auto_assign_roles || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter(id => id !== roleId)
      : [...currentRoles, roleId];
    updateLocalSetting('auto_assign_roles', newRoles);
  };

  // Check if there are unsaved changes
  const hasChanges = settings 
    ? (
        localSettings.welcome_message !== (settings.welcome_message || '') ||
        localSettings.welcome_channel_id !== (settings.welcome_channel_id || '') ||
        localSettings.system_channel_id !== (settings.system_channel_id || '') ||
        localSettings.sticker_channel_id !== (settings.sticker_channel_id || '') ||
        localSettings.boost_channel_id !== (settings.boost_channel_id || '') ||
        localSettings.tips_channel_id !== (settings.tips_channel_id || '') ||
        localSettings.activity_channel_id !== (settings.activity_channel_id || '') ||
        localSettings.system_messages_enabled !== settings.system_messages_enabled ||
        localSettings.sticker_reply_enabled !== (settings.sticker_reply_enabled ?? true) ||
        localSettings.boost_message_enabled !== (settings.boost_message_enabled ?? true) ||
        localSettings.setup_tips_enabled !== (settings.setup_tips_enabled ?? true) ||
        localSettings.activity_feed_enabled !== (settings.activity_feed_enabled ?? true) ||
        JSON.stringify((localSettings.auto_assign_roles || []).sort()) !== JSON.stringify((settings.auto_assign_roles || []).sort())
      )
    : Object.values(localSettings).some(v => v !== '' && v !== true && !(Array.isArray(v) && v.length === 0));

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-1">Engagement des membres</h3>
        <p className="text-sm text-muted-foreground">
          Suivez et améliorez l'engagement de votre communauté
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Membres actifs</span>
          </div>
          <p className="text-2xl font-bold text-blue-300">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.activeMembers || 0}
          </p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-medium">Messages</span>
          </div>
          <p className="text-2xl font-bold text-green-300">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.messagesThisWeek || 0}
          </p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20">
          <div className="flex items-center gap-2 text-pink-400 mb-2">
            <Heart className="w-4 h-4" />
            <span className="text-xs font-medium">Réactions</span>
          </div>
          <p className="text-2xl font-bold text-pink-300">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.reactionsThisWeek || 0}
          </p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Croissance</span>
          </div>
          <p className="text-2xl font-bold text-purple-300">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `+${stats?.growthThisMonth || 0}`}
          </p>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </div>
      </div>

      {/* System Messages Channel */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Canal des messages système
        </h4>
        
        <div className="space-y-2">
          <Label className="text-sm">Canal principal (par défaut)</Label>
          <Select 
            value={localSettings.system_channel_id || 'none'} 
            onValueChange={(v) => updateLocalSetting('system_channel_id', v === 'none' ? '' : v)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Sélectionner un canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {textChannels.map(channel => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    {channel.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Ce canal recevra les messages de bienvenue et autres messages système par défaut
          </p>
        </div>
      </div>

      {/* System Messages Toggles with individual channel selectors */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Messages système
        </h4>
        
        <div className="space-y-3">
          <SettingToggle
            title="Messages de bienvenue"
            description="Envoyer un message quand un nouveau membre rejoint le serveur"
            checked={localSettings.system_messages_enabled ?? true}
            onCheckedChange={(checked) => updateLocalSetting('system_messages_enabled', checked)}
          />
          
          <SettingToggle
            title="Réponses autocollants"
            description="Permettre les réponses rapides avec des stickers"
            checked={localSettings.sticker_reply_enabled ?? true}
            onCheckedChange={(checked) => updateLocalSetting('sticker_reply_enabled', checked)}
            channelSelector={
              <ChannelSelector
                value={localSettings.sticker_channel_id || ''}
                onChange={(v) => updateLocalSetting('sticker_channel_id', v)}
                channels={textChannels}
                label="Canal de destination"
              />
            }
          />
          
          <SettingToggle
            title="Messages de boost"
            description="Afficher les notifications quand quelqu'un boost le serveur"
            checked={localSettings.boost_message_enabled ?? true}
            onCheckedChange={(checked) => updateLocalSetting('boost_message_enabled', checked)}
            channelSelector={
              <ChannelSelector
                value={localSettings.boost_channel_id || ''}
                onChange={(v) => updateLocalSetting('boost_channel_id', v)}
                channels={textChannels}
                label="Canal de destination"
              />
            }
          />
          
          <SettingToggle
            title="Conseils de configuration"
            description="Afficher des conseils pour améliorer votre serveur"
            checked={localSettings.setup_tips_enabled ?? true}
            onCheckedChange={(checked) => updateLocalSetting('setup_tips_enabled', checked)}
            channelSelector={
              <ChannelSelector
                value={localSettings.tips_channel_id || ''}
                onChange={(v) => updateLocalSetting('tips_channel_id', v)}
                channels={textChannels}
                label="Canal de destination"
              />
            }
          />
          
          <SettingToggle
            title="Fil d'activité"
            description="Afficher les activités récentes des membres dans le serveur"
            checked={localSettings.activity_feed_enabled ?? true}
            onCheckedChange={(checked) => updateLocalSetting('activity_feed_enabled', checked)}
            channelSelector={
              <ChannelSelector
                value={localSettings.activity_channel_id || ''}
                onChange={(v) => updateLocalSetting('activity_channel_id', v)}
                channels={textChannels}
                label="Canal de destination"
              />
            }
          />
        </div>
      </div>

      {/* Welcome Message Settings */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Message de bienvenue personnalisé
        </h4>

        <div className="space-y-2">
          <Label className="text-sm">Canal de bienvenue</Label>
          <Select 
            value={localSettings.welcome_channel_id || 'none'} 
            onValueChange={(v) => updateLocalSetting('welcome_channel_id', v === 'none' ? '' : v)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Sélectionner un canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {textChannels.map(channel => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    {channel.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Message personnalisé</Label>
          <Textarea
            placeholder="Bienvenue {user} sur notre serveur ! 🎉"
            value={localSettings.welcome_message || ''}
            onChange={(e) => updateLocalSetting('welcome_message', e.target.value)}
            rows={3}
            className="bg-background resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Variables disponibles : <code className="px-1 py-0.5 bg-muted rounded">{'{user}'}</code> pour mentionner le membre, <code className="px-1 py-0.5 bg-muted rounded">{'{server}'}</code> pour le nom du serveur
          </p>
        </div>
      </div>

      {/* Auto-assign Roles */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Rôles automatiques
        </h4>
        <p className="text-sm text-muted-foreground">
          Ces rôles seront automatiquement attribués aux nouveaux membres
        </p>
        <div className="flex flex-wrap gap-2">
          {assignableRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground/70 italic">Aucun rôle disponible</p>
          ) : (
            assignableRoles.map(role => {
              const isSelected = (localSettings.auto_assign_roles || []).includes(role.id);
              return (
                <Badge
                  key={role.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    isSelected && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                  )}
                  style={{ 
                    backgroundColor: isSelected ? role.color || undefined : 'transparent',
                    borderColor: role.color || undefined,
                    color: isSelected ? 'white' : role.color || undefined,
                  }}
                  onClick={() => toggleRole(role.id)}
                >
                  {role.name}
                </Badge>
              );
            })
          )}
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent">
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder les modifications'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}