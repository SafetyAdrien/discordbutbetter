import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, X, Minus, Loader2 } from 'lucide-react';
import { useServerRoles, ALL_PERMISSIONS } from '@/hooks/useRoles';
import { 
  useChannelPermissionOverrides, 
  useSetPermissionOverride, 
  useRemovePermissionOverride,
  useSyncWithCategory 
} from '@/hooks/useChannelPermissions';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ServerPermission = Database['public']['Enums']['server_permission'];

interface ChannelPermissionsProps {
  channelId: string;
  serverId: string;
}

const CHANNEL_PERMISSIONS: ServerPermission[] = [
  'read_messages',
  'send_messages',
  'manage_messages',
  'connect_voice',
  'speak_voice',
  'mention_everyone',
];

export function ChannelPermissions({ channelId, serverId }: ChannelPermissionsProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { data: roles, isLoading: rolesLoading } = useServerRoles(serverId);
  const { data: overrides, isLoading: overridesLoading } = useChannelPermissionOverrides(channelId);
  const setOverride = useSetPermissionOverride();
  const removeOverride = useRemovePermissionOverride();
  const syncWithCategory = useSyncWithCategory();

  const hasOverrides = overrides && overrides.length > 0;

  const handleSync = async () => {
    try {
      await syncWithCategory.mutateAsync({ channelId });
      toast.success('Permissions synchronisées avec la catégorie');
    } catch {
      toast.error('Erreur lors de la synchronisation');
    }
  };

  const getPermissionState = (roleId: string, permission: ServerPermission): 'allow' | 'deny' | 'inherit' => {
    const override = overrides?.find(
      (o) => o.role_id === roleId && o.permission === permission
    );
    if (!override) return 'inherit';
    return override.type;
  };

  const cyclePermission = async (roleId: string, permission: ServerPermission) => {
    const current = getPermissionState(roleId, permission);
    
    try {
      if (current === 'inherit') {
        await setOverride.mutateAsync({ channelId, roleId, permission, type: 'allow' });
      } else if (current === 'allow') {
        await setOverride.mutateAsync({ channelId, roleId, permission, type: 'deny' });
      } else {
        await removeOverride.mutateAsync({ channelId, roleId, permission });
      }
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  const isLoading = rolesLoading || overridesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="space-y-1">
          <Label>Synchroniser avec la catégorie</Label>
          <p className="text-xs text-muted-foreground">
            {hasOverrides 
              ? 'Ce salon a des permissions personnalisées'
              : 'Les permissions suivent celles de la catégorie'
            }
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={!hasOverrides || syncWithCategory.isPending}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Synchroniser
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Sélectionner un rôle</Label>
        <div className="flex flex-wrap gap-2">
          {roles?.map((role) => (
            <Button
              key={role.id}
              variant={selectedRole === role.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole(role.id)}
              style={{ borderColor: role.color || undefined }}
            >
              <div 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: role.color || '#99AAB5' }} 
              />
              {role.name}
            </Button>
          ))}
        </div>
      </div>

      {selectedRole && (
        <div className="space-y-2 mt-4">
          <Label>Permissions du salon</Label>
          <div className="space-y-1">
            {CHANNEL_PERMISSIONS.map((perm) => {
              const permInfo = ALL_PERMISSIONS.find((p) => p.key === perm);
              const state = getPermissionState(selectedRole, perm);
              
              return (
                <button
                  key={perm}
                  onClick={() => cyclePermission(selectedRole, perm)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  disabled={setOverride.isPending || removeOverride.isPending}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">{permInfo?.label || perm}</p>
                    <p className="text-xs text-muted-foreground">{permInfo?.description}</p>
                  </div>
                  <Badge 
                    variant={state === 'allow' ? 'default' : state === 'deny' ? 'destructive' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {state === 'allow' && <Check className="w-3 h-3" />}
                    {state === 'deny' && <X className="w-3 h-3" />}
                    {state === 'inherit' && <Minus className="w-3 h-3" />}
                    {state === 'allow' ? 'Autoriser' : state === 'deny' ? 'Refuser' : 'Hériter'}
                  </Badge>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Cliquez pour basculer entre Hériter → Autoriser → Refuser
          </p>
        </div>
      )}
    </div>
  );
}
