import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Loader2, Pencil, CalendarDays } from 'lucide-react';
import { MarkdownLiveTextarea } from '@/components/profile/MarkdownLiveTextarea';
import { ProfileCalendar } from '@/components/profile/calendar/ProfileCalendar';
import { EventListBelow } from '@/components/profile/calendar/EventListBelow';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { ServerProfileEditModal } from '@/components/profile/ServerProfileEditModal';

const BIO_MAX = 4000;

const activityTypes = [
  { value: 'none', label: 'Aucune activité' },
  { value: 'playing', label: 'Joue à' },
  { value: 'streaming', label: 'Diffuse' },
  { value: 'listening', label: 'Écoute' },
  { value: 'watching', label: 'Regarde' },
  { value: 'competing', label: 'En compétition' },
];

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAvatar.mutate(f);
  };
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadBanner.mutate(f);
  };

  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();

  return (
    <div className="space-y-4 pb-24">
      {/* Hero — Banner + Avatar (mirrors mobile) */}
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
            <Avatar className="w-28 h-28 ring-[5px] ring-background">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-4xl font-semibold">{initial}</AvatarFallback>
            </Avatar>
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

      {/* Identity card */}
      <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="display_name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nom d'affichage
            </Label>
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
            <Label htmlFor="pronouns" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pronoms
            </Label>
            <Input
              id="pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="il/lui, elle, iel..."
              maxLength={50}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom_status" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Statut personnalisé
          </Label>
          <Input
            id="custom_status"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder="En train de jouer..."
            maxLength={128}
            className="h-11 rounded-xl"
          />
        </div>
      </section>

      {/* About card */}
      <section className="rounded-2xl bg-card border border-border/50 p-4">
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            À propos de moi
          </Label>
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
      </section>

      {/* Calendar card */}
      <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calendrier</Label>
        </div>
        <ProfileCalendar />
        <EventListBelow />
      </section>

      {/* Activity card */}
      <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Activité (Rich Presence)
        </Label>
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
      </section>

      {/* Theme card */}
      <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thème du profil</Label>
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
      </section>

      <div className="flex justify-start">
        <Button variant="outline" onClick={() => setServerProfileEditOpen(true)} className="gap-2 rounded-xl">
          <Pencil className="w-4 h-4" />
          Profils serveur
        </Button>
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
    </div>
  );
}
