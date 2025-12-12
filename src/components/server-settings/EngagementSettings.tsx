import { useState, useEffect } from 'react';
import { Heart, MessageSquare, Users, TrendingUp, Loader2 } from 'lucide-react';
import { useEngagementStats } from '@/hooks/useEngagementStats';
import { useServerSettings, useUpdateServerSettings } from '@/hooks/useServerSettings';
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

interface EngagementSettingsProps {
  serverId: string;
}

export function EngagementSettings({ serverId }: EngagementSettingsProps) {
  const { data: stats, isLoading: statsLoading } = useEngagementStats(serverId);
  const { data: settings, isLoading: settingsLoading } = useServerSettings(serverId);
  const { data: channelsData } = useChannels(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const updateSettings = useUpdateServerSettings();

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeChannelId, setWelcomeChannelId] = useState<string>('');
  const [systemMessagesEnabled, setSystemMessagesEnabled] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Get all text channels
  const textChannels = channelsData?.categories?.flatMap(cat => 
    cat.channels.filter(ch => ch.type === 'text')
  ) || [];

  // Get non-default roles
  const assignableRoles = roles.filter(r => !r.is_default);

  useEffect(() => {
    if (settings) {
      setWelcomeMessage(settings.welcome_message || '');
      setWelcomeChannelId(settings.welcome_channel_id || '');
      setSystemMessagesEnabled(settings.system_messages_enabled);
      setSelectedRoles(settings.auto_assign_roles || []);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      serverId,
      settings: {
        welcome_message: welcomeMessage || null,
        welcome_channel_id: welcomeChannelId || null,
        system_messages_enabled: systemMessagesEnabled,
        auto_assign_roles: selectedRoles,
      },
    });
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const hasChanges = settings 
    ? (welcomeMessage !== (settings.welcome_message || '') ||
       welcomeChannelId !== (settings.welcome_channel_id || '') ||
       systemMessagesEnabled !== settings.system_messages_enabled ||
       JSON.stringify(selectedRoles.sort()) !== JSON.stringify((settings.auto_assign_roles || []).sort()))
    : (welcomeMessage || welcomeChannelId || !systemMessagesEnabled || selectedRoles.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Engagement des membres</h3>
        <p className="text-sm text-muted-foreground">
          Suivez et améliorez l'engagement de votre communauté
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Membres actifs</span>
          </div>
          <p className="text-2xl font-bold">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.activeMembers || 0}
          </p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">Messages</span>
          </div>
          <p className="text-2xl font-bold">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.messagesThisWeek || 0}
          </p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Réactions</span>
          </div>
          <p className="text-2xl font-bold">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.reactionsThisWeek || 0}
          </p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Nouveaux membres</span>
          </div>
          <p className="text-2xl font-bold">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `+${stats?.growthThisMonth || 0}`}
          </p>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-6 pt-4 border-t border-border">
        <h4 className="font-semibold">Paramètres d'accueil</h4>

        {/* System messages toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="system-messages">Messages système</Label>
            <p className="text-sm text-muted-foreground">
              Afficher les messages d'arrivée et de départ
            </p>
          </div>
          <Switch
            id="system-messages"
            checked={systemMessagesEnabled}
            onCheckedChange={setSystemMessagesEnabled}
          />
        </div>

        {/* Welcome channel */}
        <div className="space-y-2">
          <Label>Canal de bienvenue</Label>
          <Select value={welcomeChannelId} onValueChange={setWelcomeChannelId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucun</SelectItem>
              {textChannels.map(channel => (
                <SelectItem key={channel.id} value={channel.id}>
                  # {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Welcome message */}
        <div className="space-y-2">
          <Label>Message de bienvenue</Label>
          <Textarea
            placeholder="Bienvenue {user} sur notre serveur !"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Utilisez {'{user}'} pour mentionner le nouveau membre
          </p>
        </div>

        {/* Auto-assign roles */}
        <div className="space-y-2">
          <Label>Rôles auto-attribués</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Ces rôles seront automatiquement attribués aux nouveaux membres
          </p>
          <div className="flex flex-wrap gap-2">
            {assignableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rôle disponible</p>
            ) : (
              assignableRoles.map(role => (
                <Badge
                  key={role.id}
                  variant={selectedRoles.includes(role.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={{ 
                    backgroundColor: selectedRoles.includes(role.id) ? role.color || undefined : 'transparent',
                    borderColor: role.color || undefined,
                    color: selectedRoles.includes(role.id) ? 'white' : role.color || undefined,
                  }}
                  onClick={() => toggleRole(role.id)}
                >
                  {role.name}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Save button */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        )}
      </div>
    </div>
  );
}
