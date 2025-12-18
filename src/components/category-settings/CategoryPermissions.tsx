import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Minus, Loader2 } from 'lucide-react';
import { useServerRoles, ALL_PERMISSIONS } from '@/hooks/useRoles';
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

  // For now, categories don't have their own permission system
  // This shows a placeholder UI similar to channel permissions
  const getPermissionState = (roleId: string, permission: ServerPermission): 'allow' | 'deny' | 'inherit' => {
    return 'inherit';
  };

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Les permissions de catégorie sont héritées par tous les salons qu'elle contient, 
          sauf si un salon a des permissions personnalisées.
        </p>
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
          <Label>Permissions de la catégorie</Label>
          <div className="space-y-1">
            {CATEGORY_PERMISSIONS.map((perm) => {
              const permInfo = ALL_PERMISSIONS.find((p) => p.key === perm);
              const state = getPermissionState(selectedRole, perm);
              
              return (
                <button
                  key={perm}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-not-allowed opacity-60"
                  disabled
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">{permInfo?.label || perm}</p>
                    <p className="text-xs text-muted-foreground">{permInfo?.description}</p>
                  </div>
                  <Badge 
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Minus className="w-3 h-3" />
                    Hériter
                  </Badge>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Les permissions de catégorie seront disponibles prochainement.
          </p>
        </div>
      )}
    </div>
  );
}
