import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil as PencilIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner, useRemoveProfileImage } from '@/hooks/useProfile';
import { useServers } from '@/hooks/useServers';
import { useUserSettingsNav } from '@/components/user-settings/UserSettingsNavContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, ChevronDown, ChevronUp, X } from '@/components/icons/discord/lucide';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { useServerProfile, useUpdateServerProfile, useDeleteServerProfile, useUploadServerAvatar, useUploadServerBanner } from '@/hooks/useServerProfile';
import { useQueryClient } from '@tanstack/react-query';
import { AvatarUploadEditor } from '@/components/profile/AvatarUploadEditor';
import { ProfileCardPanel, type ProfileCardUser } from '@/components/profile/ProfileCardPanel';
import { ProfileTabsPane } from '@/components/profile/ProfileTabsPane';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { Smile, MessageCircle } from '@/components/icons/discord/lucide';
import { ServerTagMenu } from '@/components/server-tags/ServerTagMenu';
import { useClearMyServerTag, useSetMyServerTag, useUserServerTag } from '@/hooks/useServerTags';
import { tagErrorMessage } from '@/lib/serverTags';
import { toast } from 'sonner';
import { SelectImageModal, RemoveImageDialog } from './AvatarDialogs';
import { cn } from '@/lib/utils';

/*
 * Editeur de profil (video de reference) : fenetre a trois colonnes ouverte depuis
 * "Profils". A gauche le selecteur de profil (principal / profils de serveur) et les
 * reglages (avatar, couleur de banniere) ; au centre la carte de profil modifiable en
 * place (nom, pronoms, biographie, statut) ; a droite les onglets Tableau / Calendrier /
 * Activite / Liste de souhaits. Une barre "N'oublie pas d'enregistrer..." apparait des
 * qu'une modification est en attente et se secoue si l'on essaie de fermer sans enregistrer.
 * Les elements Nitro (plaque de nom, effets, cadres, decorations, style du nom) sont exclus.
 */

const BIO_MAX = 4000;
const DEFAULT_COLOR = '#00D4FF';

const activityTypes = [
  { value: 'none', label: 'Aucune activité' },
  { value: 'playing', label: 'Joue à' },
  { value: 'streaming', label: 'Diffuse' },
  { value: 'listening', label: 'Écoute' },
  { value: 'watching', label: 'Regarde' },
  { value: 'competing', label: 'En compétition' },
];

const menuItem = 'h-9 px-2 rounded-[4px] text-sm font-medium';

export function ProfileEditor() {
  const { profile } = useAuth();
  const { goTo } = useUserSettingsNav();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadBanner = useUploadBanner();
  const removeAvatar = useRemoveProfileImage('avatar');
  const removeBanner = useRemoveProfileImage('banner');
  const { data: servers = [] } = useServers();

  const p = profile as any;
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [pronouns, setPronouns] = useState(p?.pronouns || '');
  const [activityType, setActivityType] = useState(p?.activity_type || 'none');
  const [activityText, setActivityText] = useState(p?.activity_text || '');
  const [themeColor, setThemeColor] = useState(p?.theme_color || DEFAULT_COLOR);
  const [useGradient, setUseGradient] = useState(!!p?.theme_gradient);
  const [gradientStart, setGradientStart] = useState(p?.theme_gradient?.split(',')[0] || DEFAULT_COLOR);
  const [gradientEnd, setGradientEnd] = useState(p?.theme_gradient?.split(',')[1] || '#8B5CF6');

  // Tag de serveur : brouillon applique avec "Enregistrer" (undefined = inchange, null = aucun).
  const [tagDraft, setTagDraft] = useState<string | null | undefined>(undefined);
  const { data: currentTag } = useUserServerTag(profile?.id);
  const setMyTag = useSetMyServerTag();
  const clearMyTag = useClearMyServerTag();
  const tagDirty = tagDraft !== undefined && tagDraft !== (currentTag?.serverId ?? null);
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Profil edite : null = principal, sinon l'id du serveur (profil propre a ce serveur).
  const [serverId, setServerId] = useState<string | null>(null);
  const server = servers.find((x) => x.id === serverId) ?? null;
  const { data: sp } = useServerProfile(profile?.id ?? null, serverId);
  const updateServer = useUpdateServerProfile();
  const deleteServer = useDeleteServerProfile();
  const uploadServerAvatar = useUploadServerAvatar();
  const uploadServerBanner = useUploadServerBanner();
  const queryClient = useQueryClient();
  const [sName, setSName] = useState('');
  const [sBio, setSBio] = useState('');
  const [sPronouns, setSPronouns] = useState('');
  const [sAvatar, setSAvatar] = useState('');
  const [sBanner, setSBanner] = useState('');
  useEffect(() => {
    setSName(sp?.display_name || '');
    setSBio(sp?.bio || '');
    setSPronouns(sp?.pronouns || '');
    setSAvatar(sp?.avatar_url || '');
    setSBanner(sp?.banner_url || '');
  }, [sp, serverId]);
  const [selectOpen, setSelectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState<null | 'avatar' | 'banner'>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [shake, setShake] = useState(0);
  const bannerInput = useRef<HTMLInputElement>(null);

  const initial = {
    displayName: profile?.display_name || '',
    bio: profile?.bio || '',
    pronouns: p?.pronouns || '',
    activityType: p?.activity_type || 'none',
    activityText: p?.activity_text || '',
    themeColor: p?.theme_color || DEFAULT_COLOR,
    useGradient: !!p?.theme_gradient,
    gradientStart: p?.theme_gradient?.split(',')[0] || DEFAULT_COLOR,
    gradientEnd: p?.theme_gradient?.split(',')[1] || '#8B5CF6',
  };
  const serverDirty =
    !!serverId &&
    (sName !== (sp?.display_name || '') ||
      sBio !== (sp?.bio || '') ||
      sPronouns !== (sp?.pronouns || '') ||
      sAvatar !== (sp?.avatar_url || '') ||
      sBanner !== (sp?.banner_url || ''));
  const dirty = serverId ? serverDirty :
    tagDirty ||
    displayName !== initial.displayName ||
    bio !== initial.bio ||
    pronouns !== initial.pronouns ||
    activityType !== initial.activityType ||
    activityText !== initial.activityText ||
    useGradient !== initial.useGradient ||
    (useGradient ? gradientStart !== initial.gradientStart || gradientEnd !== initial.gradientEnd : themeColor !== initial.themeColor);

  const reset = () => {
    setTagDraft(undefined);
    if (serverId) {
      setSName(sp?.display_name || '');
      setSBio(sp?.bio || '');
      setSPronouns(sp?.pronouns || '');
      setSAvatar(sp?.avatar_url || '');
      setSBanner(sp?.banner_url || '');
      return;
    }
    setDisplayName(initial.displayName);
    setBio(initial.bio);
    setPronouns(initial.pronouns);
    setActivityType(initial.activityType);
    setActivityText(initial.activityText);
    setThemeColor(initial.themeColor);
    setUseGradient(initial.useGradient);
    setGradientStart(initial.gradientStart);
    setGradientEnd(initial.gradientEnd);
  };

  const save = () => {
    if (serverId) {
      updateServer.mutate({
        serverId,
        updates: {
          display_name: sName.trim() || null,
          bio: sBio || null,
          pronouns: sPronouns.trim() || null,
          ...(sAvatar ? { avatar_url: sAvatar } : { avatar_url: null }),
          ...(sBanner ? { banner_url: sBanner } : { banner_url: null }),
        },
      });
      return;
    }
    if (tagDirty) {
      (tagDraft === null ? clearMyTag.mutateAsync() : setMyTag.mutateAsync(tagDraft as string))
        .then(() => { setTagDraft(undefined); toast.success(tagDraft === null ? 'Tag retiré' : 'Tag du serveur enregistré'); })
        .catch((e) => toast.error(tagErrorMessage(e)));
    }
    updateProfile.mutate({
      display_name: displayName.trim() || initial.displayName,
      bio,
      pronouns: pronouns.trim() || null,
      activity_type: activityType === 'none' ? null : activityType,
      activity_text: activityType === 'none' ? null : activityText || null,
      theme_color: useGradient ? null : themeColor,
      theme_gradient: useGradient ? `${gradientStart},${gradientEnd}` : null,
    } as any);
  };

  const requestClose = () => {
    if (dirty) return setShake((n) => n + 1);
    goTo('account');
  };

  // Echap ferme (ou secoue la barre s'il reste des modifications) ; la fenetre de reglages
  // dessous ne reagit pas : on intercepte avant elle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper], [role="menu"]')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      requestClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const switchTo = (id: string | null) => {
    if (dirty) return setShake((n) => n + 1);
    setServerId(id);
  };

  if (!profile) return null;

  const bannerBackground = useGradient ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` : themeColor;
  const inServer = !!serverId;
  const members = serverId ? queryClient.getQueryData<any[]>(['members', serverId]) : undefined;
  const myMember = members?.find((m) => m.user?.id === profile.id);
  const cardUser: ProfileCardUser = {
    id: profile.id,
    display_name: inServer ? sName || displayName : displayName,
    username: (profile as any).username || '',
    avatar_url: (inServer ? sAvatar : '') || profile.avatar_url || null,
    banner_url: (inServer ? sBanner : '') || profile.banner_url || null,
    bio: inServer ? sBio || bio : bio,
    status: (p?.status as string) || 'online',
    created_at: p?.created_at ?? null,
    pronouns: inServer ? sPronouns || pronouns : pronouns,
    custom_status: profile.custom_status ?? null,
    connections: Array.isArray(p?.connections) ? p.connections : null,
  };

  const doRemove = (kind: 'avatar' | 'banner') => {
    if (serverId) return kind === 'avatar' ? setSAvatar('') : setSBanner('');
    (kind === 'avatar' ? removeAvatar : removeBanner).mutate();
  };
  const askRemove = (kind: 'avatar' | 'banner', shiftKey: boolean) => {
    if (shiftKey) return doRemove(kind);
    setRemoveOpen(kind);
  };
  const hasAvatar = serverId ? !!sAvatar : !!profile.avatar_url;
  const hasBanner = serverId ? !!sBanner : !!profile.banner_url;
  const sendAvatar = (file: File) =>
    serverId
      ? uploadServerAvatar.mutate({ serverId, file }, { onSuccess: (url) => setSAvatar(url) })
      : uploadAvatar.mutate(file);
  const sendBanner = (file: File) =>
    serverId
      ? uploadServerBanner.mutate({ serverId, file }, { onSuccess: (url) => setSBanner(url) })
      : uploadBanner.mutate(file);

  const avatarMenu = (trigger: React.ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="z-[140] min-w-[200px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
        <DropdownMenuItem className={menuItem} onSelect={() => setSelectOpen(true)}>Changer l'avatar</DropdownMenuItem>
        {hasAvatar && (
          <DropdownMenuItem
            className={cn(menuItem, 'text-[#f57976] focus:text-[#f57976]')}
            onSelect={(e) => askRemove('avatar', (e as unknown as { shiftKey?: boolean }).shiftKey ?? false)}
          >
            Supprimer l'avatar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const pencil = (label: string) => (
    <button
      type="button"
      aria-label={label}
      className="w-8 h-8 rounded-full bg-[hsl(220_8%_14%)] hover:bg-black text-white flex items-center justify-center shadow-md transition-colors data-[state=open]:bg-black"
    >
      <PencilIcon className="w-4 h-4" />
    </button>
  );

  const bannerSlot = (
    <>
    <div aria-hidden className="absolute inset-0 bg-black/0 group-hover/banner:bg-black/25 transition-colors duration-150 pointer-events-none" />
    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover/banner:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{pencil('Modifier la bannière')}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="z-[140] min-w-[200px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
          <DropdownMenuItem className={menuItem} onSelect={() => bannerInput.current?.click()}>Changer la bannière</DropdownMenuItem>
          {hasBanner && (
            <DropdownMenuItem
              className={cn(menuItem, 'text-[#f57976] focus:text-[#f57976]')}
              onSelect={(e) => askRemove('banner', (e as unknown as { shiftKey?: boolean }).shiftKey ?? false)}
            >
              Supprimer la bannière
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {(uploadBanner.isPending || uploadServerBanner.isPending) && <Loader2 className="absolute -left-7 top-2 w-4 h-4 animate-spin text-white" />}
    </div>
    </>
  );

  const avatarSlot = (
    <div className="absolute inset-0 rounded-full">
      {avatarMenu(
        <button
          type="button"
          aria-label="Modifier l'avatar"
          className="absolute inset-0 rounded-full bg-black/45 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
        >
          <PencilIcon className="w-7 h-7" />
        </button>,
      )}
      {(uploadAvatar.isPending || uploadServerAvatar.isPending) && (
        <span className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-white" />
        </span>
      )}
    </div>
  );

  const activityEditor = (
    <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-4 space-y-3">
      <p className="text-sm font-semibold text-white">Activité (Rich Presence)</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Select value={activityType} onValueChange={setActivityType}>
          <SelectTrigger className="h-10 rounded-lg" aria-label="Type d'activité">
            <SelectValue placeholder="Type d'activité" />
          </SelectTrigger>
          <SelectContent className="z-[140]">
            {activityTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={activityText}
          onChange={(e) => setActivityText(e.target.value)}
          placeholder={activityType === 'streaming' ? 'URL du stream' : 'Nom du jeu / de l\'activité'}
          disabled={activityType === 'none'}
          maxLength={128}
          className="h-10 rounded-lg"
        />
      </div>
    </div>
  );

  const body = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-100">
      <div className="absolute inset-0 bg-black/85" onClick={requestClose} />
      <div
        role="dialog"
        aria-label="Modifier le profil"
        aria-modal="true"
        className={cn("relative flex h-[89vh] max-h-[930px] rounded-xl overflow-hidden bg-[#313139] border border-white/[0.04] shadow-2xl animate-in zoom-in-[0.97] fade-in-0 duration-150 [transition:width_250ms_ease-out]", collapsed ? "w-[calc(min(94vw,1442px)-290px)]" : "w-[min(94vw,1442px)]")}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={requestClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[hsl(var(--icon-default))] hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Colonne de gauche */}
        <aside className={cn('shrink-0 bg-[#383840] overflow-y-auto scrollbar-thin transition-[width,opacity] duration-200', collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[290px] opacity-100')}>
          <div className="w-[290px]">
            <div className="flex items-center justify-between h-[59px] px-5 border-b border-black/[0.12]">
              <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
                <PopoverTrigger asChild>
                  <button type="button" aria-haspopup="menu" aria-expanded={switcherOpen} className="flex items-center gap-1.5 text-base font-medium text-white">
                    {server ? <span translate="no" className="truncate max-w-[170px]">{server.name}</span> : 'Profil principal'}
                    {switcherOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={8} className="z-[140] w-[266px] p-1.5 rounded-lg bg-[hsl(var(--input))] border border-white/[0.08] max-h-[320px] overflow-y-auto scrollbar-thin">
                  <button type="button" onClick={() => { setSwitcherOpen(false); switchTo(null); }} className={cn('w-full h-9 px-2 rounded-[4px] flex items-center gap-2 text-sm font-medium text-white hover:bg-white/[0.06]', !serverId && 'bg-white/[0.08]')}>
                    <UserAvatarImage src={profile.avatar_url} alt="" className="w-5 h-5" fallbackClassName="text-[10px]" fallback={initial.displayName.charAt(0).toUpperCase()} ownerId={profile.id} />
                    <span className="flex-1 text-left truncate">Profil principal</span>
                    {!serverId && <Check className="w-4 h-4" />}
                  </button>
                  {servers.length > 0 && <p className="px-2 pt-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">Profils de serveur</p>}
                  {servers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        switchTo(s.id);
                      }}
                      className={cn('w-full h-9 px-2 rounded-[4px] flex items-center gap-2 text-sm font-medium text-white hover:bg-white/[0.06]', serverId === s.id && 'bg-white/[0.08]')}
                    >
                      {s.icon_url ? (
                        <img src={s.icon_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-primary/30 text-[10px] flex items-center justify-center">{s.name.charAt(0).toUpperCase()}</span>
                      )}
                      <span translate="no" className="flex-1 text-left truncate">{s.name}</span>
                      {serverId === s.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Masquer les styles" onClick={() => setCollapsed(true)} className="w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                    <ChevronsLeft />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Masquer les styles</TooltipContent>
              </Tooltip>
            </div>

            <div className="px-5 pt-[21px] pb-8">
            <h3 className="mb-[10px] text-sm leading-5 font-medium text-[#dbdee1]">Avatar</h3>
            <div className="h-[120px] w-[120px] rounded-lg bg-[#43434b] hover:bg-[#4a4a53] transition-colors flex items-center justify-center">
              {avatarMenu(
                <button type="button" aria-label="Modifier l'avatar" className="rounded-full focus-visible:ring-2 focus-visible:ring-primary">
                  <UserAvatarImage
                    src={(serverId ? sAvatar : '') || profile.avatar_url}
                    alt={profile.display_name}
                    className="w-[88px] h-[88px]"
                    fallbackClassName="bg-primary/20 text-primary text-3xl font-semibold"
                    fallback={initial.displayName.charAt(0).toUpperCase()}
                    ownerId={profile.id}
                  />
                </button>,
              )}
            </div>

            {serverId && (
              <>
                <p className="mt-3 text-xs text-muted-foreground">Ce profil n'est visible que dans « {server?.name} ». Les champs vides reprennent ton profil principal.</p>
                <button
                  type="button"
                  disabled={deleteServer.isPending || !sp}
                  onClick={() =>
                    deleteServer.mutate(serverId, {
                      onSuccess: () => {
                        setSName(''); setSBio(''); setSPronouns(''); setSAvatar(''); setSBanner('');
                      },
                    })
                  }
                  className="mt-4 h-9 px-3 rounded-lg border border-[#da373c] text-[#f57976] hover:bg-[#da373c]/10 text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Réinitialiser le profil du serveur
                </button>
              </>
            )}
            {!serverId && (<>
            <h3 className="mt-7 mb-[10px] text-sm leading-5 font-medium text-[#dbdee1]">Couleur de la bannière</h3>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Choisir la couleur de la bannière"
                  className="h-[50px] w-full rounded-lg hover:brightness-110 transition-[filter]"
                  style={{ background: bannerBackground }}
                />
              </PopoverTrigger>
              <PopoverContent side="right" align="start" sideOffset={12} className="z-[140] w-[300px] p-3 rounded-lg bg-[hsl(var(--input))] border border-white/[0.08] space-y-3">
                <div className="flex gap-1 p-1 rounded-lg bg-black/20">
                  {[false, true].map((g) => (
                    <button
                      key={String(g)}
                      type="button"
                      onClick={() => setUseGradient(g)}
                      className={cn('flex-1 h-8 rounded-md text-sm font-medium transition-colors', useGradient === g ? 'bg-white/[0.12] text-white' : 'text-muted-foreground hover:text-white')}
                    >
                      {g ? 'Dégradé' : 'Couleur unie'}
                    </button>
                  ))}
                </div>
                {useGradient ? (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs uppercase text-muted-foreground">Début</p>
                      <ModernColorPicker value={gradientStart} onChange={setGradientStart} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase text-muted-foreground">Fin</p>
                      <ModernColorPicker value={gradientEnd} onChange={setGradientEnd} />
                    </div>
                  </div>
                ) : (
                  <ModernColorPicker value={themeColor} onChange={setThemeColor} />
                )}
              </PopoverContent>
            </Popover>
            <p className="mt-2 text-xs text-muted-foreground">S'affiche quand tu n'as pas d'image de bannière.</p>
            </>)}
            </div>
          </div>
        </aside>

        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Afficher les styles" onClick={() => setCollapsed(false)} className="absolute left-3 top-4 z-20 w-8 h-8 rounded-md flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white hover:bg-white/[0.06] rotate-180">
                <ChevronsLeft />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Afficher les styles</TooltipContent>
          </Tooltip>
        )}

        {/* Carte + onglets */}
        <div className="flex-1 min-w-0 flex gap-[clamp(20px,2vw,39px)] pl-[clamp(20px,3vw,58px)] pr-[clamp(20px,3vw,57px)] pt-[58px]">
          <ProfileCardPanel
            className="w-[clamp(380px,36vw,480px)] shrink-0 rounded-t-xl"
            user={cardUser}
            isOwn
            bannerStyle={{ background: bannerBackground }}
            actions={
              <span aria-disabled className="h-[38px] px-4 rounded-lg bg-[#474c8f] text-[#c3c6ea] flex items-center gap-2 text-base font-medium select-none cursor-default">
                <MessageCircle className="w-[18px] h-[18px]" /> Message
              </span>
            }
            serverJoin={inServer && myMember?.joined_at ? { date: myMember.joined_at, icon: server?.icon_url ?? null, name: server?.name ?? '' } : null}
            roles={inServer && myMember ? (myMember.roles ?? []).filter((r: any) => r.name !== '@everyone') : undefined}
            editor={{
              name: inServer ? sName : displayName,
              onName: inServer ? setSName : setDisplayName,
              pronouns: inServer ? sPronouns : pronouns,
              onPronouns: inServer ? setSPronouns : setPronouns,
              bio: inServer ? sBio : bio,
              onBio: inServer ? setSBio : setBio,
              bioMax: inServer ? 500 : BIO_MAX,
              namePlaceholder: inServer ? displayName : undefined,
              pronounsPlaceholder: inServer ? 'Définir des pronoms pour ce serveur' : undefined,
              bioPlaceholder: inServer ? 'Biographie propre à ce serveur…' : undefined,
              avatarSlot,
              bannerSlot,
              onAddConnection: () => goTo('connections'),
              tagSlot: serverId ? undefined : <ServerTagMenu value={tagDraft} onChange={setTagDraft} />,
              bioEmoji: (
                <EmojiStickerPicker
                  serverId={null}
                  onEmojiSelect={(e) => (inServer ? setSBio((b) => (b + e).slice(0, 500)) : setBio((b) => (b + e).slice(0, BIO_MAX)))}
                  trigger={
                    <button type="button" aria-label="Ajouter un émoji" className="w-6 h-6 rounded-full flex items-center justify-center text-[#b5bac1] hover:text-white transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                  }
                />
              ),
            }}
          />
          <ProfileTabsPane
            className="flex-1 min-w-[240px] pb-24 pt-4"
            userId={profile.id}
            voiceUser={{ id: profile.id, display_name: profile.display_name ?? '', avatar_url: profile.avatar_url ?? null }}
            isOwn
            activity={{ type: activityType === 'none' ? null : activityType, text: activityText }}
            activityEditor={activityEditor}
          />
        </div>

        {/* Barre d'enregistrement */}
        {dirty && (
          <div
            key={shake}
            role="status"
            className={cn(
              'absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(560px,calc(100%-48px))] h-[52px] rounded-lg pl-4 pr-2 flex items-center gap-3 shadow-[0_8px_16px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom-4 fade-in-0 duration-200',
              shake > 0 ? 'bg-[#da373c] [animation:pe-shake_0.4s_ease-in-out]' : 'bg-[hsl(var(--popover))] border border-white/[0.06]',
            )}
          >
            <span className="flex-1 text-sm font-medium text-white truncate">N'oublie pas d'enregistrer tes modifications !</span>
            <button type="button" onClick={reset} disabled={(updateProfile.isPending || updateServer.isPending || setMyTag.isPending || clearMyTag.isPending)} className="h-8 px-3 rounded-md text-sm font-medium text-white hover:underline">
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={save}
              disabled={(updateProfile.isPending || updateServer.isPending || setMyTag.isPending || clearMyTag.isPending)}
              className="h-8 min-w-[88px] px-4 rounded-md bg-primary hover:bg-primary/90 text-sm font-medium text-white transition-colors disabled:opacity-60 flex items-center justify-center"
            >
              {(updateProfile.isPending || updateServer.isPending || setMyTag.isPending || clearMyTag.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      <input
        ref={bannerInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) sendBanner(f);
        }}
      />
      <SelectImageModal
        open={selectOpen}
        onOpenChange={setSelectOpen}
        avatarUrl={(serverId ? sAvatar : '') || profile.avatar_url || null}
        displayName={initial.displayName}
        userId={profile.id}
        uploading={uploadAvatar.isPending || uploadServerAvatar.isPending}
        onFile={setCropFile}
        onGif={sendAvatar}
      />
      <RemoveImageDialog
        open={removeOpen !== null}
        onOpenChange={(o) => !o && setRemoveOpen(null)}
        kind={removeOpen ?? 'avatar'}
        avatarUrl={profile.avatar_url ?? null}
        displayName={initial.displayName}
        userId={profile.id}
        onConfirm={() => doRemove(removeOpen === 'banner' ? 'banner' : 'avatar')}
      />
      <AvatarUploadEditor
        open={!!cropFile}
        file={cropFile}
        onClose={() => setCropFile(null)}
        onFinish={(file) => {
          setCropFile(null);
          sendAvatar(file);
        }}
      />
    </div>
  );

  return createPortal(body, document.body);
}

function ChevronsLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  );
}
