import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PermissionState } from '@/components/ui/permission-toggle';
import { PermissionCategoryAccordion } from '@/components/ui/permission-category-accordion';
import { Loader2, RefreshCw, Plus, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useServerRoles } from '@/hooks/useRoles';
import { 
  useCategoryPermissionOverrides, 
  useSetCategoryPermissionOverride, 
  useRemoveCategoryPermissionOverride,
  useSyncCategoryWithServer,
  useResetRoleCategoryOverrides
} from '@/hooks/useCategoryPermissions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getCategoryPermissions, ServerPermission } from '@/constants/permissions';

interface CategoryPermissionsProps {
  categoryId: string;
  serverId: string;
}

export function CategoryPermissions({ categoryId, serverId }: CategoryPermissionsProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const { data: roles, isLoading: rolesLoading } = useServerRoles(serverId);
  const { data: overrides, isLoading: overridesLoading } = useCategoryPermissionOverrides(categoryId);
  const setOverride = useSetCategoryPermissionOverride();
  const removeOverride = useRemoveCategoryPermissionOverride();
  const syncWithServer = useSyncCategoryWithServer();
  const resetRoleOverrides = useResetRoleCategoryOverrides();

  // Get permission categories for categories
  const permissionCategories = getCategoryPermissions();

  const hasOverrides = overrides && overrides.length > 0;
  const selectedRoleHasOverrides = selectedRole && overrides?.some(o => o.role_id === selectedRole);
  const selectedRoleOverrideCount = selectedRole 
    ? overrides?.filter(o => o.role_id === selectedRole).length || 0 
    : 0;

  useEffect(() => {
    if (setOverride.isSuccess || removeOverride.isSuccess) {
      setShowSavedIndicator(true);
      const timer = setTimeout(() => setShowSavedIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [setOverride.isSuccess, removeOverride.isSuccess]);

  const handleSync = async () => {
    try {
      await syncWithServer.mutateAsync({ categoryId });
      setSelectedRole(null);
      toast.success('Permissions synchronisées avec le serveur');
    } catch {
      toast.error('Erreur lors de la synchronisation');
    }
  };

  const handleResetRole = async () => {
    if (!selectedRole) return;
    
    try {
      await resetRoleOverrides.mutateAsync({ categoryId, roleId: selectedRole });
      toast.success('Permissions du rôle réinitialisées');
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const getPermissionState = (permission: ServerPermission): PermissionState => {
    if (!selectedRole) return 'inherit';
    const override = overrides?.find(
      (o) => o.role_id === selectedRole && o.permission === permission
    );
    if (!override) return 'inherit';
    return override.type as PermissionState;
  };

  const handlePermissionChange = async (permission: ServerPermission, newState: PermissionState | boolean) => {
    if (!selectedRole) return;
    const state = newState as PermissionState;
    
    try {
      if (state === 'inherit') {
        await removeOverride.mutateAsync({ categoryId, roleId: selectedRole, permission: permission as any });
      } else {
        await setOverride.mutateAsync({ categoryId, roleId: selectedRole, permission: permission as any, type: state });
      }
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  const getModifiedCountForCategory = (categoryId: string): number => {
    if (!selectedRole || !overrides) return 0;
    const category = permissionCategories.find(c => c.id === categoryId);
    if (!category) return 0;
    
    return category.permissions.filter(perm => 
      overrides.some(o => o.role_id === selectedRole && o.permission === perm.key)
    ).length;
  };

  // Get roles that have overrides for this category
  const rolesWithOverrides = roles?.filter(role => 
    overrides?.some(o => o.role_id === role.id)
  ) || [];

  const isLoading = rolesLoading || overridesLoading;
  const isMutating = setOverride.isPending || removeOverride.isPending || resetRoleOverrides.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Save indicator */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300",
        showSavedIndicator 
          ? "bg-green-500/10 border border-green-500/30" 
          : "bg-muted/30 border border-transparent"
      )}>
        {showSavedIndicator ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500 font-medium">Modifications sauvegardées</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">
              Les modifications sont sauvegardées automatiquement
            </span>
          </>
        )}
        {isMutating && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
        )}
      </div>

      {/* Sync with server */}
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
          {syncWithServer.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Synchroniser
        </Button>
      </div>

      {/* Role selection */}
      <div className="space-y-2">
        <Label>Sélectionner un rôle</Label>
        <div className="flex flex-wrap gap-2">
          {rolesWithOverrides.map((role) => (
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
              <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                {overrides?.filter(o => o.role_id === role.id).length || 0}
              </Badge>
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

      {/* Permission categories */}
      {selectedRole && (
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label>Permissions de la catégorie</Label>
            {selectedRoleHasOverrides && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetRole}
                disabled={resetRoleOverrides.isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                {resetRoleOverrides.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Réinitialiser ({selectedRoleOverrideCount})
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {permissionCategories.map((category) => (
              <PermissionCategoryAccordion
                key={category.id}
                category={category}
                getPermissionState={getPermissionState}
                onPermissionChange={handlePermissionChange}
                disabled={isMutating}
                mode="toggle"
                showInherit={true}
                modifiedCount={getModifiedCountForCategory(category.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
