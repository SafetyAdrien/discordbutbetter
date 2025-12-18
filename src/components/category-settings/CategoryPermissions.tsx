import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Minus, Loader2, RefreshCw, Plus } from 'lucide-react';
import { useServerRoles, ALL_PERMISSIONS } from '@/hooks/useRoles';
import { 
  useCategoryPermissionOverrides, 
  useSetCategoryPermissionOverride, 
  useRemoveCategoryPermissionOverride,
  useSyncCategoryWithServer 
} from '@/hooks/useCategoryPermissions';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ServerPermission = Database['public']['Enums']['server_permission'];

interface CategoryPermissionsProps {
  categoryId: string;
  serverId: string;
}

const CATEGORY_PERMISSIONS: ServerPermission[] = [
  'read_messages',
  'send_messages',
  'manage_messages',
  'connect_voice',
  'speak_voice',
  'mention_everyone',
];

export function CategoryPermissions({ categoryId, serverId }: CategoryPermissionsProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { data: roles, isLoading: rolesLoading } = useServerRoles(serverId);
  const { data: overrides, isLoading: overridesLoading } = useCategoryPermissionOverrides(categoryId);
  const setOverride = useSetCategoryPermissionOverride();
  const removeOverride = useRemoveCategoryPermissionOverride();
  const syncWithServer = useSyncCategoryWithServer();

  const hasOverrides = overrides && overrides.length > 0;

  const handleSync = async () => {
    try {
      await syncWithServer.mutateAsync({ categoryId });
      toast.success('Permissions synchronisées avec le serveur');
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
        await setOverride.mutateAsync({ categoryId, roleId, permission, type: 'allow' });
      } else if (current === 'allow') {
        await setOverride.mutateAsync({ categoryId, roleId, permission, type: 'deny' });
      } else {
        await removeOverride.mutateAsync({ categoryId, roleId, permission });
      }
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  // Get roles that have overrides for this category
  const rolesWithOverrides = roles?.filter(role => 
    overrides?.some(o => o.role_id === role.id)
  ) || [];

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
          <Label>Synchroniser avec le serveur</Label>
          <p className="text-xs text-muted-foreground">
            {hasOverrides 
              ? `Cette catégorie a ${overrides.length} permission(s) personnalisée(s)`
              : 'Les permissions suivent celles du serveur'
            }
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={!hasOverrides || syncWithServer.isPending}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Synchroniser
        </Button>
      </div>

      {/* Roles with overrides */}
      {rolesWithOverrides.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Rôles avec permissions personnalisées</Label>
          <div className="flex flex-wrap gap-2">
            {rolesWithOverrides.map((role) => (
              <Badge 
                key={role.id}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-muted"
                style={{ borderColor: role.color || undefined }}
                onClick={() => setSelectedRole(role.id)}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: role.color || '#99AAB5' }} 
                />
                {role.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="border-dashed">
                <Plus className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-2 py-1">Ajouter un rôle</p>
                {roles?.filter(role => !rolesWithOverrides.some(r => r.id === role.id)).map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left"
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: role.color || '#99AAB5' }} 
                    />
                    {role.name}
                  </button>
                ))}
                {roles?.filter(role => !rolesWithOverrides.some(r => r.id === role.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-2">Tous les rôles ont déjà des permissions</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {selectedRole && (
        <div className="space-y-2 mt-4">
          <Label>Permissions de la catégorie</Label>
          <div className="space-y-1">
            {CATEGORY_PERMISSIONS.map((perm) => {
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
