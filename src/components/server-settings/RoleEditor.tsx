import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUpdateRole, RoleWithPermissions, ALL_PERMISSIONS, ServerPermission } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface RoleEditorProps {
  role: RoleWithPermissions;
  serverId: string;
}

export function RoleEditor({ role, serverId }: RoleEditorProps) {
  const updateRole = useUpdateRole();

  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color || '#99AAB5');
  const [permissions, setPermissions] = useState<Set<ServerPermission>>(
    new Set(role.permissions)
  );

  // Reset form when role changes
  useEffect(() => {
    setName(role.name);
    setColor(role.color || '#99AAB5');
    setPermissions(new Set(role.permissions));
  }, [role.id]);

  const togglePermission = (permission: ServerPermission) => {
    const newPerms = new Set(permissions);
    if (newPerms.has(permission)) {
      newPerms.delete(permission);
    } else {
      newPerms.add(permission);
    }
    setPermissions(newPerms);
  };

  const handleSave = () => {
    updateRole.mutate({
      roleId: role.id,
      serverId,
      name,
      color,
      permissions: Array.from(permissions),
    });
  };

  const hasChanges =
    name !== role.name ||
    color !== (role.color || '#99AAB5') ||
    JSON.stringify([...permissions].sort()) !==
      JSON.stringify([...role.permissions].sort());

  const isAdmin = permissions.has('administrator');

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role-name">Nom du rôle</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={role.is_default}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label>Couleur</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
              disabled={role.is_default}
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={role.is_default}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div>
        <Label className="mb-4 block">Permissions</Label>
        {role.is_default && (
          <p className="text-sm text-muted-foreground mb-4">
            Le rôle @everyone est le rôle par défaut attribué à tous les membres.
          </p>
        )}

        <div className="space-y-2">
          {ALL_PERMISSIONS.map((perm) => {
            const isEnabled = permissions.has(perm.key);
            const isDisabled = perm.key !== 'administrator' && isAdmin;

            return (
              <div
                key={perm.key}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg transition-colors',
                  isEnabled ? 'bg-primary/5' : 'bg-muted/30',
                  isDisabled && 'opacity-50'
                )}
              >
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium">{perm.label}</p>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
                <Switch
                  checked={isEnabled || isDisabled}
                  onCheckedChange={() => togglePermission(perm.key)}
                  disabled={isDisabled}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-0 py-4 bg-gradient-to-t from-card to-transparent">
          <Button
            onClick={handleSave}
            disabled={updateRole.isPending || !name.trim()}
            className="w-full"
          >
            {updateRole.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
