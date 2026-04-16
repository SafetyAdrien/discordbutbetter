import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useUpdateRole, RoleWithPermissions } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionCategoryAccordion } from '@/components/ui/permission-category-accordion';
import { Loader2, ImagePlus, X, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRolePermissions, ServerPermission } from '@/constants/permissions';

interface RoleEditorProps {
  role: RoleWithPermissions;
  serverId: string;
}

export function RoleEditor({ role, serverId }: RoleEditorProps) {
  const updateRole = useUpdateRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color || '#99AAB5');
  const [iconUrl, setIconUrl] = useState(role.icon_url || '');
  const [emojiInput, setEmojiInput] = useState('');
  const [hoist, setHoist] = useState(role.hoist || false);
  const [description, setDescription] = useState(role.description || '');
  const [isUploading, setIsUploading] = useState(false);
  const [permissions, setPermissions] = useState<Set<ServerPermission>>(
    new Set(role.permissions as ServerPermission[])
  );

  // Get all role permission categories
  const permissionCategories = getRolePermissions();

  // Reset form when role changes
  useEffect(() => {
    setName(role.name);
    setColor(role.color || '#99AAB5');
    setIconUrl(role.icon_url || '');
    setEmojiInput('');
    setHoist(role.hoist || false);
    setDescription(role.description || '');
    setPermissions(new Set(role.permissions as ServerPermission[]));
  }, [role.id]);

  const togglePermission = (permission: ServerPermission, enabled: boolean) => {
    const newPerms = new Set(permissions);
    if (enabled) {
      newPerms.add(permission);
    } else {
      newPerms.delete(permission);
    }
    setPermissions(newPerms);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 256 * 1024) {
      toast.error('L\'image doit faire moins de 256 Ko');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${serverId}/${role.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('role-icons')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('role-icons')
        .getPublicUrl(fileName);

      setIconUrl(publicUrl + '?t=' + Date.now());
      setEmojiInput('');
      toast.success('Icône uploadée !');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEmojiChange = (value: string) => {
    const emoji = [...value][0] || '';
    if (emoji) {
      setIconUrl(emoji);
      setEmojiInput(emoji);
    }
  };

  const handleRemoveIcon = () => {
    setIconUrl('');
    setEmojiInput('');
  };

  const handleSave = () => {
    updateRole.mutate({
      roleId: role.id,
      serverId,
      name,
      color,
      iconUrl: iconUrl || null,
      hoist,
      description: description || null,
      permissions: Array.from(permissions) as any[],
    });
  };

  const hasChanges =
    name !== role.name ||
    color !== (role.color || '#99AAB5') ||
    iconUrl !== (role.icon_url || '') ||
    hoist !== (role.hoist || false) ||
    description !== (role.description || '') ||
    JSON.stringify([...permissions].sort()) !==
      JSON.stringify([...role.permissions].sort());

  const isAdmin = permissions.has('administrator');

  const isEmojiIcon = iconUrl && !iconUrl.startsWith('http');

  const getPermissionState = (permission: ServerPermission): boolean => {
    return permissions.has(permission);
  };

  const handlePermissionChange = (permission: ServerPermission, state: boolean | any) => {
    togglePermission(permission, state as boolean);
  };

  const getEnabledCountForCategory = (categoryId: string): number => {
    const category = permissionCategories.find(c => c.id === categoryId);
    if (!category) return 0;
    return category.permissions.filter(perm => permissions.has(perm.key)).length;
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
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
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={role.is_default}
              placeholder="Décrivez le rôle et ses responsabilités..."
              maxLength={200}
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{description.length}/200 caractères</p>
          </div>

          {/* Role Icon */}
          <div className="space-y-2">
            <Label>Icône du rôle</Label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                {iconUrl ? (
                  isEmojiIcon ? (
                    <span className="text-xl">{iconUrl}</span>
                  ) : (
                    <img src={iconUrl} alt="Role icon" className="w-6 h-6 object-contain" />
                  )
                ) : (
                  <Shield className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || role.is_default}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4 mr-2" />
                )}
                Uploader
              </Button>

              <Input
                placeholder="ou emoji 🎮"
                value={emojiInput}
                onChange={(e) => handleEmojiChange(e.target.value)}
                className="w-28"
                disabled={role.is_default}
              />

              {iconUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveIcon}
                  disabled={role.is_default}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Uploadez une image (max 256 Ko) ou entrez un emoji
            </p>
          </div>

          {/* Hoist Option */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Afficher séparément dans la liste des membres</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Les membres ayant ce rôle seront affichés dans un groupe séparé
                  </p>
                </div>
              </div>
              <Switch
                checked={hoist}
                onCheckedChange={setHoist}
                disabled={role.is_default}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4 space-y-4">
          {role.is_default && (
            <p className="text-sm text-muted-foreground">
              Le rôle @everyone est le rôle par défaut attribué à tous les membres.
            </p>
          )}

          {isAdmin && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Ce rôle a la permission Administrateur. Toutes les autres permissions sont automatiquement activées.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {permissionCategories.map((category) => (
              <PermissionCategoryAccordion
                key={category.id}
                category={category}
                getPermissionState={getPermissionState}
                onPermissionChange={handlePermissionChange}
                mode="switch"
                showInherit={false}
                modifiedCount={getEnabledCountForCategory(category.id)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

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
