import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useUpdateRole, RoleWithPermissions, ALL_PERMISSIONS, ServerPermission } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, ImagePlus, X, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [isUploading, setIsUploading] = useState(false);
  const [permissions, setPermissions] = useState<Set<ServerPermission>>(
    new Set(role.permissions)
  );

  // Reset form when role changes
  useEffect(() => {
    setName(role.name);
    setColor(role.color || '#99AAB5');
    setIconUrl(role.icon_url || '');
    setEmojiInput('');
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
    // Only take the first character/emoji
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
      permissions: Array.from(permissions),
    });
  };

  const hasChanges =
    name !== role.name ||
    color !== (role.color || '#99AAB5') ||
    iconUrl !== (role.icon_url || '') ||
    JSON.stringify([...permissions].sort()) !==
      JSON.stringify([...role.permissions].sort());

  const isAdmin = permissions.has('administrator');

  // Check if iconUrl is an emoji (single character or emoji) vs URL
  const isEmojiIcon = iconUrl && !iconUrl.startsWith('http');

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

      {/* Role Icon */}
      <div className="space-y-2">
        <Label>Icône du rôle</Label>
        <div className="flex items-center gap-3">
          {/* Preview */}
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

          {/* Upload button */}
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

          {/* Emoji input */}
          <Input
            placeholder="ou emoji 🎮"
            value={emojiInput}
            onChange={(e) => handleEmojiChange(e.target.value)}
            className="w-28"
            disabled={role.is_default}
          />

          {/* Remove button */}
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