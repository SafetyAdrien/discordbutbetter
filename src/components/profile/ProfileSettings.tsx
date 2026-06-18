import { useState, useRef } from 'react';
import { ServerProfileEditModal } from '@/components/profile/ServerProfileEditModal';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Camera, Loader2, Pencil, CalendarDays } from 'lucide-react';
import { MarkdownLiveTextarea } from '@/components/profile/MarkdownLiveTextarea';
import { ProfileCalendar } from '@/components/profile/calendar/ProfileCalendar';
import { EventListBelow } from '@/components/profile/calendar/EventListBelow';

interface ProfileSettingsProps {
  onClose: () => void;
}

const BIO_MAX = 4000;

const activityTypes = [
  { value: 'none', label: 'Aucune activité' },
  { value: 'playing', label: 'Joue à' },
  { value: 'streaming', label: 'Diffuse' },
  { value: 'listening', label: 'Écoute' },
  { value: 'watching', label: 'Regarde' },
  { value: 'competing', label: 'En compétition' },
];

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadBanner = useUploadBanner();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [pronouns, setPronouns] = useState(profile?.pronouns || '');
  const [customStatus, setCustomStatus] = useState(profile?.custom_status || '');
  const [activityType, setActivityType] = useState(profile?.activity_type || 'none');
  const [activityText, setActivityText] = useState(profile?.activity_text || '');
  const [themeColor, setThemeColor] = useState(profile?.theme_color || '#00D4FF');
  const [useGradient, setUseGradient] = useState(!!profile?.theme_gradient);
  const [gradientStart, setGradientStart] = useState(profile?.theme_gradient?.split(',')[0] || '#00D4FF');
  const [gradientEnd, setGradientEnd] = useState(profile?.theme_gradient?.split(',')[1] || '#8B5CF6');
  const [serverProfileEditOpen, setServerProfileEditOpen] = useState(false);

  const hasChanges =
    displayName !== (profile?.display_name || '') ||
    bio !== (profile?.bio || '') ||
    pronouns !== (profile?.pronouns || '') ||
    customStatus !== (profile?.custom_status || '') ||
    activityType !== (profile?.activity_type || 'none') ||
    activityText !== (profile?.activity_text || '') ||
    themeColor !== (profile?.theme_color || '#00D4FF') ||
    useGradient !== !!profile?.theme_gradient;

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
    setPronouns(profile?.pronouns || '');
    setCustomStatus(profile?.custom_status || '');
    setActivityType(profile?.activity_type || 'none');
    setActivityText(profile?.activity_text || '');
    setThemeColor(profile?.theme_color || '#00D4FF');
    setUseGradient(!!profile?.theme_gradient);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadBanner.mutate(file);
  };

  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-background border border-border shadow-2xl m-4 overflow-hidden">
        {/* Hero — Banner + Avatar (mirrors mobile) */}
        <section className="relative shrink-0">
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
            onClick={onClose}
            className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/75 backdrop-blur-md hover:bg-background/90 transition-colors z-10"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>

          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/75 backdrop-blur-md hover:bg-background/90 transition-colors z-10"
            aria-label="Changer la bannière"
          >
            {uploadBanner.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-foreground" />}
          </button>

          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

          <div className="px-6 -mt-14 relative z-10">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative hover:opacity-80 transition-opacity shrink-0"
              aria-label="Changer l'avatar"
            >
              <Avatar className="w-28 h-28 ring-[5px] ring-background">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-4xl font-semibold">
                  {initial}
                </AvatarFallback>
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-4">
          {/* Identity card */}
          <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nom d'affichage
                </Label>
                <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} className="h-11 rounded-xl" />
                <p className="text-[11px] text-muted-foreground">{displayName.length}/32</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronouns" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pronoms
                </Label>
                <Input id="pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="il/lui, elle, iel..." maxLength={50} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_status" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Statut personnalisé
              </Label>
              <Input id="custom_status" value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} placeholder="En train de jouer..." maxLength={128} className="h-11 rounded-xl" />
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
              <p className="text-[11px] text-muted-foreground text-right">{bio.length}/{BIO_MAX}</p>
            </div>
          </section>

          {/* Calendar card */}
          <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Calendrier
              </Label>
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
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Thème du profil
            </Label>
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
              <div className="flex gap-2">
                <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-11 h-11 rounded cursor-pointer" />
                <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="flex-1 h-11 rounded-xl" placeholder="#00D4FF" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <input type="color" value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} className="w-11 h-11 rounded cursor-pointer" />
                  <Input value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} placeholder="Début" className="h-11 rounded-xl" />
                </div>
                <div className="flex gap-2">
                  <input type="color" value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} className="w-11 h-11 rounded cursor-pointer" />
                  <Input value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} placeholder="Fin" className="h-11 rounded-xl" />
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
        </div>

        {/* Floating save bar */}
        {hasChanges && (
          <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-md px-4 py-3 flex items-center gap-2">
            <span className="text-sm flex-1 text-foreground/90">Modifications non enregistrées</span>
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={updateProfile.isPending} className="rounded-full">
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending} className="rounded-full">
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </div>
        )}

        <ServerProfileEditModal open={serverProfileEditOpen} onOpenChange={setServerProfileEditOpen} />
      </div>
    </div>
  );
}
