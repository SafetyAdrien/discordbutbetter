import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Loader2, Pencil, CalendarDays, MessageCircle, Smile } from 'lucide-react';
import { MarkdownLiveTextarea } from '@/components/profile/MarkdownLiveTextarea';
import { ProfileCalendar } from '@/components/profile/calendar/ProfileCalendar';
import { EventListBelow } from '@/components/profile/calendar/EventListBelow';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { ServerProfileEditModal } from '@/components/profile/ServerProfileEditModal';
import { AvatarUploadEditor } from '@/components/profile/AvatarUploadEditor';
import { FullUserProfileModal } from '@/components/profile/FullUserProfileModal';

const BIO_MAX = 4000;

const activityTypes = [
  { value: 'none', label: 'Aucune activité' },
  { value: 'playing', label: 'Joue à' },
  { value: 'streaming', label: 'Diffuse' },
  { value: 'listening', label: 'Écoute' },
  { value: 'watching', label: 'Regarde' },
  { value: 'competing', label: 'En compétition' },
];

const statusDotColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

/** Label de champ — même style plat que Fluxer (petit texte gris au-dessus du champ, pas d'encart). */
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
}

export function ProfileSettingsTab() {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadBanner = useUploadBanner();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const p = profile as any;
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [pronouns, setPronouns] = useState(p?.pronouns || '');
  const [customStatus, setCustomStatus] = useState(profile?.custom_status || '');
  const [activityType, setActivityType] = useState(p?.activity_type || 'none');
  const [activityText, setActivityText] = useState(p?.activity_text || '');
  const [themeColor, setThemeColor] = useState(p?.theme_color || '#00D4FF');
  const [useGradient, setUseGradient] = useState(!!p?.theme_gradient);
  const [gradientStart, setGradientStart] = useState(p?.theme_gradient?.split(',')[0] || '#00D4FF');
  const [gradientEnd, setGradientEnd] = useState(p?.theme_gradient?.split(',')[1] || '#8B5CF6');
  const [serverProfileEditOpen, setServerProfileEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const hasChanges =
    displayName !== (profile?.display_name || '') ||
    bio !== (profile?.bio || '') ||
    pronouns !== (p?.pronouns || '') ||
    customStatus !== (profile?.custom_status || '') ||
    activityType !== (p?.activity_type || 'none') ||
    activityText !== (p?.activity_text || '') ||
    themeColor !== (p?.theme_color || '#00D4FF') ||
    useGradient !== !!p?.theme_gradient ||
    (useGradient &&
      (gradientStart !== (p?.theme_gradient?.split(',')[0] || '#00D4FF') ||
        gradientEnd !== (p?.theme_gradient?.split(',')[1] || '#8B5CF6')));

  const handleSave = () => {
    const themeGradient = useGradient ? `${gradientStart},${gradientEnd}` : null;
    updateProfile.mutate({
      display_name: displayName,
      bio,
      pronouns: pronouns || null,
      custom_status: customStatus || null,
      activity_type: activityType === 'none' ? null : activityType,
      activity_text: activityText || null,
      theme_color: useGradient ? null : themeColor,
      theme_gradient: themeGradient,
    } as any);
  };

  const handleReset = () => {
    setDisplayName(profile?.display_name || '');
    setBio(profile?.bio || '');
    setPronouns(p?.pronouns || '');
    setCustomStatus(profile?.custom_status || '');
    setActivityType(p?.activity_type || 'none');
    setActivityText(p?.activity_text || '');
    setThemeColor(p?.theme_color || '#00D4FF');
    setUseGradient(!!p?.theme_gradient);
    setGradientStart(p?.theme_gradient?.split(',')[0] || '#00D4FF');
    setGradientEnd(p?.theme_gradient?.split(',')[1] || '#8B5CF6');
  };

  const [avatarEditorFile, setAvatarEditorFile] = useState<File | null>(null);
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) setAvatarEditorFile(f);
  };
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadBanner.mutate(f);
  };

  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();
  const accentColor = useGradient ? gradientStart : themeColor;
  const status = (p?.status as string) || 'offline';

  const previewUser = profile
    ? {
        id: profile.id,
        display_name: profile.display_name || '',
        username: (profile as any).username || '',
        avatar_url: profile.avatar_url ?? null,
        banner_url: profile.banner_url ?? null,
        bio: profile.bio ?? null,
        status,
        created_at: (profile as any).created_at ?? null,
        pronouns: p?.pronouns ?? null,
        custom_status: profile.custom_status ?? null,
      }
    : null;

  return (
    // lg:h-full : ne prend effet qu'à partir du breakpoint lg — c'est à ce
    // moment-là que le parent (AccountSettingsModal, contentRef) bascule lui
    // aussi en overflow-hidden pour cet onglet et laisse CE composant gérer
    // son propre scroll. En dessous de lg, ce div reste un bloc normal dans
    // le flux, et c'est le contentRef parent (overflow-y-auto) qui scrolle —
    // comportement mobile inchangé.
    <div className="lg:h-full lg:flex lg:flex-col">
      <div className="lg:flex-1 lg:min-h-0 lg:flex lg:gap-6">
        {/* Colonne gauche — édition. Scroll interne indépendant en desktop
            (lg:overflow-y-auto sur SON PROPRE div, pas sur un ancêtre partagé
            avec la colonne de preview) : c'est ce qui garantit que la preview
            à droite ne peut plus jamais bouger, peu importe ce qui se passe
            avec position:sticky. */}
        <div className="lg:flex-1 lg:overflow-y-auto lg:min-w-0 space-y-5 pb-24 lg:pb-6 lg:pr-1 order-2 lg:order-1">
          {/* Hero — Banner + Avatar, cliquables pour éditer */}
          <section className="relative rounded-2xl overflow-hidden border border-border/50">
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className={`relative w-full block group ${profile?.banner_url ? 'h-40' : 'h-32'}`}
              aria-label="Changer la bannière"
            >
              {profile?.banner_url ? (
                <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: useGradient
                      ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
                      : `linear-gradient(135deg, ${themeColor}, hsl(var(--primary)))`,
                  }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/75 backdrop-blur-md hover:bg-background/90 transition-colors z-10"
              aria-label="Changer la bannière"
            >
              {uploadBanner.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

            <div className="px-6 -mt-14 pb-4 relative z-10">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative hover:opacity-80 transition-opacity shrink-0"
                aria-label="Changer l'avatar"
              >
                <UserAvatarImage
                  src={profile?.avatar_url}
                  alt={profile?.display_name}
                  className="w-28 h-28 ring-[5px] ring-background"
                  fallbackClassName="bg-primary/20 text-primary text-4xl font-semibold"
                  fallback={initial}
                />
                <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full border-[4px] border-background bg-primary flex items-center justify-center">
                  {uploadAvatar.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary-foreground" />
                  ) : (
                    <Camera className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </section>

          {/* Champs à plat, un par ligne, sans encart — même structure que
              Fluxer (label discret au-dessus, champ pleine largeur, pas de
              regroupement en grille ni de bordure de carte). */}
          <div className="space-y-5">
            <div className="space-y-2">
              <FieldLabel htmlFor="display_name">Nom d'affichage</FieldLabel>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">{displayName.length}/32</p>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="pronouns">Pronoms</FieldLabel>
              <Input
                id="pronouns"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="il/lui, elle, iel..."
                maxLength={50}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="custom_status">Statut personnalisé</FieldLabel>
              <Input
                id="custom_status"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="En train de jouer..."
                maxLength={128}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <FieldLabel>Avatar</FieldLabel>
              <div className="flex gap-2">
                <Button type="button" onClick={() => avatarInputRef.current?.click()} className="rounded-xl">
                  Changer l'avatar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                JPEG, PNG, GIF, WebP. 10 Mo max. Recommandé : 512×512px
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel>Bannière</FieldLabel>
              <div className="flex gap-2">
                <Button type="button" onClick={() => bannerInputRef.current?.click()} className="rounded-xl">
                  Changer la bannière
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                JPEG, PNG, GIF, WebP. 10 Mo max. Minimum : 680×240px (17:6)
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel>Couleur d'accent</FieldLabel>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" checked={!useGradient} onChange={() => setUseGradient(false)} className="w-4 h-4" />
                  Couleur unie
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" checked={useGradient} onChange={() => setUseGradient(true)} className="w-4 h-4" />
                  Dégradé
                </label>
              </div>
              {!useGradient ? (
                <ModernColorPicker value={themeColor} onChange={setThemeColor} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Début</p>
                    <ModernColorPicker value={gradientStart} onChange={setGradientStart} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fin</p>
                    <ModernColorPicker value={gradientEnd} onChange={setGradientEnd} />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Personnalise la bordure et la couleur de bannière de ton profil.
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="bio">À propos de moi</FieldLabel>
              <MarkdownLiveTextarea
                id="bio"
                value={bio}
                onChange={setBio}
                maxLength={BIO_MAX}
                rows={6}
                placeholder="Parlez de vous… **gras**, *italique*, `code`, > citation, listes, [liens](https://…)"
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {bio.length}/{BIO_MAX}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <FieldLabel>Calendrier</FieldLabel>
              </div>
              <ProfileCalendar />
              <EventListBelow />
            </div>

            <div className="space-y-2">
              <FieldLabel>Activité (Rich Presence)</FieldLabel>
              <div className="grid sm:grid-cols-2 gap-3">
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Type d'activité" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  placeholder={activityType === 'streaming' ? 'URL du stream' : 'Nom du jeu/activité'}
                  disabled={activityType === 'none'}
                  maxLength={128}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Button variant="outline" onClick={() => setServerProfileEditOpen(true)} className="gap-2 rounded-xl">
                <Pencil className="w-4 h-4" />
                Profils serveur
              </Button>
            </div>
          </div>
        </div>

        {/* Colonne droite — Preview style Fluxer. AUCUN scroll, ne bouge
            jamais : ce div n'est jamais placé dans un conteneur qui défile
            (contrairement à la colonne de gauche, qui a son propre
            overflow-y-auto isolé ci-dessus). */}
        <div className="lg:w-[320px] lg:shrink-0 space-y-4 mb-4 lg:mb-0 order-1 lg:order-2">
          <section className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Aperçu du profil
            </Label>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-full rounded-lg overflow-hidden border-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-card"
              style={{ borderColor: accentColor }}
              aria-label="Ouvrir l'aperçu complet du profil"
            >
              {/* Bannière — hauteur ~105px comme dans Fluxer */}
              <div className="relative h-[105px]">
                {profile?.banner_url ? (
                  <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: useGradient
                        ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
                        : `linear-gradient(135deg, ${themeColor}, hsl(var(--primary)))`,
                    }}
                  />
                )}
                {/* Avatar 80px qui déborde avec une bordure épaisse de la couleur de fond de la carte */}
                <div className="absolute -bottom-10 left-4">
                  <div className="relative">
                    <UserAvatarImage
                      src={profile?.avatar_url}
                      alt={profile?.display_name}
                      className="w-20 h-20 border-[6px] border-card"
                      fallbackClassName="bg-primary/20 text-primary text-2xl font-semibold"
                      fallback={initial}
                    />
                    <span
                      className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[3px] border-card ${statusDotColors[status] || statusDotColors.offline}`}
                      aria-label={`Statut: ${status}`}
                    />
                  </div>
                </div>
              </div>

              {/* Contenu */}
              <div className="px-4 pt-12 pb-4 space-y-3">
                <div className="space-y-0.5">
                  <h3 className="text-xl font-bold text-foreground leading-tight truncate">
                    {displayName || profile?.display_name || 'Utilisateur'}
                  </h3>
                  {(profile as any)?.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{(profile as any).username?.toLowerCase()}
                    </p>
                  )}
                  {pronouns && (
                    <p className="text-xs text-muted-foreground italic">{pronouns}</p>
                  )}
                </div>

                {customStatus && (
                  <div className="flex items-start gap-2 text-sm text-foreground/90">
                    <Smile className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="break-words">{customStatus}</span>
                  </div>
                )}

                {(profile as any)?.created_at && (
                  <div className="pt-2 border-t border-border/50 space-y-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Membre depuis
                    </p>
                    <p className="text-sm text-foreground/90 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date((profile as any).created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {bio && (
                  <p className="text-sm text-foreground/85 whitespace-pre-wrap line-clamp-3">{bio}</p>
                )}

                {/* Bouton Modifier le profil — reproduit le "Message" en pleine largeur de Fluxer */}
                <div
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm font-semibold pointer-events-none select-none"
                  aria-hidden="true"
                >
                  <MessageCircle className="w-4 h-4" />
                  Modifier le profil
                </div>
              </div>
            </button>
          </section>
        </div>
      </div>

      {/* Floating save bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(640px,calc(100vw-2rem))]">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md px-4 py-3 flex items-center gap-2 shadow-2xl">
            <span className="text-sm flex-1 text-foreground/90">Modifications non enregistrées</span>
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={updateProfile.isPending} className="rounded-full">
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending} className="rounded-full">
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}

      <ServerProfileEditModal open={serverProfileEditOpen} onOpenChange={setServerProfileEditOpen} />
      <AvatarUploadEditor
        open={!!avatarEditorFile}
        file={avatarEditorFile}
        onClose={() => setAvatarEditorFile(null)}
        onFinish={(file) => {
          setAvatarEditorFile(null);
          uploadAvatar.mutate(file);
        }}
      />
      <FullUserProfileModal user={previewUser} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
