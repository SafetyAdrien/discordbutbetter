import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useUpdateRole, useAssignRoleToMember, useRemoveRoleFromMember, RoleWithPermissions } from '@/hooks/useRoles';
import { useMembers, type MemberWithProfile } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { Check, Pipette } from '@/components/icons/discord/lucide';
import { ImagePlus, MoreHorizontal, Plus, Search, Users, X } from '@/components/icons/serverSettingsIcons';
import { ConnectionRulesManager } from './ConnectionRulesManager';
import { SettingsDivider, SettingsSection, SettingsToggleRow, UnsavedChangesBar } from './SettingsUI';
import { settingsInputCls, settingsLabelCls, settingsTextareaCls } from './settingsStyles';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRolePermissions, ServerPermission } from '@/constants/permissions';

interface RoleEditorProps {
  role: RoleWithPermissions;
  serverId: string;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const DEFAULT_ROLE_COLOR = '#99AAB5';
// Palette de couleurs de role de Discord (deux rangees de dix).
const ROLE_COLOR_PRESETS = [
  '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#607d8b',
  '#11806a', '#1f8b4c', '#206694', '#71368a', '#ad1457', '#c27c0e', '#a84300', '#992d22', '#979c9f', '#546e7a',
];

export function RoleEditor({ role, serverId, onDuplicate, onDelete }: RoleEditorProps) {
  const [tab, setTab] = useState<'display' | 'permissions' | 'links' | 'members'>('display');
  const [permQuery, setPermQuery] = useState('');
  const { data: allMembers = [] } = useMembers(serverId);
  const roleMembers = allMembers.filter((m) => m.roles.some((r) => r.id === role.id));
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

  const resetForm = () => {
    setName(role.name);
    setColor(role.color || '#99AAB5');
    setIconUrl(role.icon_url || '');
    setEmojiInput('');
    setHoist(role.hoist || false);
    setDescription(role.description || '');
    setPermissions(new Set(role.permissions as ServerPermission[]));
  };

  // Reset form when role changes
  useEffect(() => {
    resetForm();
    setTab('display');
  }, [role.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      permissions: Array.from(permissions),
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

  const memberCount = roleMembers.length;
  const query = permQuery.trim().toLowerCase();
  const filteredCategories = permissionCategories
    .map((c) => ({
      ...c,
      permissions: c.permissions.filter(
        (p) => !query || p.label.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
      ),
    }))
    .filter((c) => c.permissions.length > 0);

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'display', label: 'Affichage' },
    { id: 'permissions', label: 'Permissions' },
    ...(role.is_default ? [] : [{ id: 'links' as const, label: 'Liens' }, { id: 'members' as const, label: `Gérer les membres (${memberCount})` }]),
  ];

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white truncate">
          Modifier le rôle — {role.name}
        </h2>
        {!role.is_default && (onDuplicate || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Plus d'options" className="p-1 text-[hsl(var(--header-icon))] hover:text-white">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDuplicate && <DropdownMenuItem onClick={onDuplicate}>Dupliquer le rôle</DropdownMenuItem>}
              {onDelete && (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                  Supprimer le rôle
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-4 flex gap-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'pb-3 -mb-px text-sm font-medium border-b-2 transition-colors',
              tab === t.id ? 'border-primary text-[hsl(var(--primary))] brightness-125' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'display' && (
        <div className="mt-6">
          <label htmlFor="role-name" className={settingsLabelCls}>
            Nom du rôle <span className="text-destructive">*</span>
          </label>
          <input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={role.is_default}
            maxLength={100}
            className={settingsInputCls}
          />

          <SettingsDivider />

          <SettingsSection title="Style du rôle">
            <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Style du rôle">
              {[
                { id: 'solid', label: 'Uni', on: true },
                { id: 'gradient', label: 'Dégradé', on: false },
                { id: 'holo', label: 'Holographique', on: false },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  role="radio"
                  aria-checked={st.on}
                  aria-disabled={!st.on}
                  title={st.on ? undefined : 'Bientôt disponible'}
                  className={cn(
                    'rounded-lg overflow-hidden text-left border-2 transition-colors bg-[hsl(var(--input))]',
                    st.on ? 'border-[#5865f2]' : 'border-transparent opacity-45 cursor-not-allowed',
                  )}
                >
                  <span className="flex items-center gap-2.5 px-3 pt-3 pb-3">
                    <span className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-[#5865f2] to-[#9b59b6]" />
                    <span className="min-w-0 leading-5 text-base font-medium">
                      <span className="block truncate font-semibold" style={st.on ? { color } : undefined}>{st.on ? (name || 'Rôle') : 'Wumpus'}</span>
                      <span className="block truncate text-white/85">les rôles sont…</span>
                    </span>
                  </span>
                  <span className={cn('block py-1.5 text-center text-sm', st.on ? 'bg-[#5865f2]/25 text-white' : 'bg-black/20 text-muted-foreground')}>{st.label}</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            title={<>Couleur du rôle <span className="text-destructive">*</span></>}
            description="Les membres utilisent la couleur du rôle le plus élevé qu'ils ont dans la liste des rôles."
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setColor(DEFAULT_ROLE_COLOR)}
                aria-label="Couleur par défaut"
                className="w-[66px] h-[50px] shrink-0 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: DEFAULT_ROLE_COLOR }}
              >
                {color.toLowerCase() === DEFAULT_ROLE_COLOR.toLowerCase() && <Check className="w-5 h-5 text-white" />}
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Couleur personnalisée"
                    className="w-[66px] h-[50px] shrink-0 rounded-lg relative flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: color }}
                  >
                    <Pipette className="absolute top-1 right-1 w-3.5 h-3.5 text-white mix-blend-difference" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[340px] p-0 border-none bg-transparent shadow-none">
                  <ModernColorPicker value={color} onChange={setColor} />
                </PopoverContent>
              </Popover>
              <div className="grid grid-cols-10 gap-2">
                {ROLE_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Couleur ${c}`}
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {color.toLowerCase() === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            title="Icône de rôle"
            description="Uploade une image de taille inférieure à 256 Ko ou choisis un émoji. Les membres avec plusieurs rôles verront l'icône de leur rôle le plus élevé."
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-[hsl(var(--card))] flex items-center justify-center">
                {iconUrl ? (
                  isEmojiIcon ? <span className="text-3xl">{iconUrl}</span> : <img src={iconUrl} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading || role.is_default}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Choisir une image'}
              </Button>
              <input
                placeholder="ou un émoji 🎮"
                value={emojiInput}
                onChange={(e) => handleEmojiChange(e.target.value)}
                disabled={role.is_default}
                className={cn(settingsInputCls, 'w-32')}
              />
              {iconUrl && (
                <button type="button" onClick={handleRemoveIcon} disabled={role.is_default} className="text-sm font-medium text-foreground hover:underline">
                  Retirer
                </button>
              )}
            </div>
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection title="Description" description="Explique à quoi sert ce rôle (200 caractères maximum).">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={role.is_default}
              maxLength={200}
              placeholder="Décris le rôle et ses responsabilités..."
              className={settingsTextareaCls}
            />
          </SettingsSection>

          <SettingsDivider />

          <SettingsToggleRow
            title="Afficher les membres ayant ce rôle séparément des membres en ligne"
            checked={hoist}
            onCheckedChange={setHoist}
            disabled={role.is_default}
          />
        </div>
      )}

      {tab === 'permissions' && (
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={permQuery}
              onChange={(e) => setPermQuery(e.target.value)}
              placeholder="Rechercher des permissions"
              className={cn(settingsInputCls, 'pl-9')}
            />
          </div>
          {role.is_default && (
            <p className="mt-3 text-sm text-muted-foreground">
              Le rôle @everyone s'applique à tous les membres du serveur.
            </p>
          )}
          {isAdmin && (
            <p className="mt-3 px-3 py-2 rounded-lg bg-[#f0b232]/10 border border-[#f0b232]/30 text-sm text-[#f0b232]">
              Ce rôle a la permission Administrateur : toutes les autres permissions sont accordées.
            </p>
          )}
          {filteredCategories.map((category, i) => (
            <div key={category.id} className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">{category.label}</h3>
                {i === 0 && (
                  <button type="button" onClick={() => setPermissions(new Set())} className="text-sm font-medium text-[hsl(var(--text-link))] hover:underline">
                    Supprimer les permissions
                  </button>
                )}
              </div>
              {category.permissions.map((perm) => (
                <SettingsToggleRow
                  key={perm.key}
                  title={perm.label}
                  description={perm.description}
                  checked={permissions.has(perm.key)}
                  onCheckedChange={(v) => togglePermission(perm.key, v)}
                />
              ))}
            </div>
          ))}
          {filteredCategories.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Aucune permission ne correspond.</p>}
        </div>
      )}

      {tab === 'links' && (
        <div className="mt-6">
          <SettingsSection
            title="Créer un rôle lié"
            description="Attribue automatiquement ce rôle aux membres qui ont lié un compte (X, Instagram, Bluesky, YouTube) respectant tes critères."
          />
          <div className="mt-4">
            <ConnectionRulesManager serverId={serverId} roleId={role.id} embedded />
          </div>
        </div>
      )}

      {tab === 'members' && (
        <RoleMembersTab serverId={serverId} role={role} members={allMembers} roleMembers={roleMembers} />
      )}

      <UnsavedChangesBar
        visible={hasChanges && (tab === 'display' || tab === 'permissions')}
        onReset={resetForm}
        onSave={handleSave}
        saving={updateRole.isPending || !name.trim()}
      />
    </div>
  );
}

function RoleMembersTab({
  serverId,
  role,
  members,
  roleMembers,
}: {
  serverId: string;
  role: RoleWithPermissions;
  members: MemberWithProfile[];
  roleMembers: MemberWithProfile[];
}) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const assign = useAssignRoleToMember();
  const remove = useRemoveRoleFromMember();
  const match = (m: MemberWithProfile, q: string) =>
    !q || [m.nickname, m.user.display_name, m.user.username].some((v) => v?.toLowerCase().includes(q.toLowerCase()));
  const shown = roleMembers.filter((m) => match(m, query));
  const candidates = members.filter((m) => !roleMembers.includes(m) && match(m, addQuery)).slice(0, 50);

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher des membres" className={cn(settingsInputCls, 'pl-9')} />
        </div>
        <Button onClick={() => setAdding(true)}>Ajouter des membres</Button>
      </div>
      {roleMembers.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          Aucun membre n'a ce rôle.{' '}
          <button type="button" onClick={() => setAdding(true)} className="text-[hsl(var(--text-link))] hover:underline">
            Ajouter des membres à ce rôle.
          </button>
        </p>
      ) : (
        <ul className="mt-3">
          {shown.map((m) => (
            <li key={m.id} className="flex items-center gap-3 h-12 px-2 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))] group">
              <Avatar className="w-8 h-8">
                <AvatarImage src={m.user.avatar_url ?? undefined} />
                <AvatarFallback>{m.user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-base text-foreground truncate">{m.nickname || m.user.display_name}</span>
              <span translate="no" className="text-sm text-muted-foreground truncate">{m.user.username}</span>
              <button
                type="button"
                aria-label="Retirer du rôle"
                onClick={() => remove.mutate({ memberId: m.id, roleId: role.id, serverId })}
                className="ml-auto opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-[440px] p-6 gap-0">
          <DialogTitle className="text-xl font-semibold text-white">Ajouter des membres</DialogTitle>
          <DialogDescription className="mt-1 mb-4 text-sm text-muted-foreground">{role.name}</DialogDescription>
          <input autoFocus value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="Rechercher des membres" className={settingsInputCls} />
          <ul className="mt-3 max-h-[320px] overflow-y-auto scrollbar-thin">
            {candidates.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => assign.mutate({ memberId: m.id, roleId: role.id, serverId, role })}
                  className="w-full flex items-center gap-3 h-11 px-2 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))] text-left"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={m.user.avatar_url ?? undefined} />
                    <AvatarFallback>{m.user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm text-foreground">{m.nickname || m.user.display_name}</span>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              </li>
            ))}
            {candidates.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun membre à ajouter.</li>}
          </ul>
          <Button variant="secondary" className="mt-4" onClick={() => setAdding(false)}>Terminé</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
