import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { haptics } from '@/lib/haptics';

interface Props {
  onBack: () => void;
}

const BIO_MAX = 4000;

export function MobileEditProfileView({ onBack }: Props) {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadBanner = useUploadBanner();
  const reduced = useReducedMotion();
  const swipe = useSwipeBack({
    onBack: () => {
      haptics.light();
      onBack();
    },
  });

  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [pronouns, setPronouns] = useState(profile?.pronouns || '');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setPronouns(profile.pronouns || '');
    }
  }, [profile]);

  const hasChanges =
    displayName !== (profile?.display_name || '') ||
    bio !== (profile?.bio || '') ||
    pronouns !== (profile?.pronouns || '');

  const handleSave = () => {
    haptics.medium();
    updateProfile.mutate({
      display_name: displayName,
      bio,
      pronouns: pronouns || null,
    });
  };

  const handleReset = () => {
    haptics.light();
    setDisplayName(profile?.display_name || '');
    setBio(profile?.bio || '');
    setPronouns(profile?.pronouns || '');
  };

  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { x: '100%' }}
      animate={{ x: 0 }}
      exit={reduced ? { opacity: 1 } : { x: '100%' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
      className="absolute inset-0 z-40 bg-background flex flex-col"
      {...swipe}
    >
      <div className="flex-1 overflow-y-auto pb-32" style={{ overscrollBehavior: 'contain' }}>
        {/* Hero — Banner + Avatar (mirrors MobileProfileView) */}
        <section className="relative">
          <button
            type="button"
            onClick={() => bannerRef.current?.click()}
            className={`relative w-full block group ${profile?.banner_url ? 'h-32' : 'h-24'}`}
            aria-label="Changer la bannière"
          >
            {profile?.banner_url ? (
              <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: profile?.theme_color
                    ? `linear-gradient(135deg, ${profile.theme_color}, hsl(var(--primary)))`
                    : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))',
                }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-active:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>

          {/* Back button — positioned inside the banner like the close X on the profile view */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onBack();
            }}
            className="absolute top-3 left-3 flex h-8 w-8 min-w-[2rem] max-w-[2rem] min-h-[2rem] max-h-[2rem] aspect-square shrink-0 items-center justify-center rounded-full bg-background/75 p-0 leading-none backdrop-blur-md active:bg-background/90 transition-colors overflow-hidden z-10"
            aria-label="Retour"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>

          {/* Banner camera badge */}
          <button
            type="button"
            onClick={() => bannerRef.current?.click()}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/75 backdrop-blur-md active:bg-background/90 transition-colors z-10"
            aria-label="Changer la bannière"
          >
            <Camera className="w-4 h-4 text-foreground" />
          </button>

          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadBanner.mutate(file);
            }}
          />

          <div className="px-4 -mt-12 relative z-10">
            <div className="flex items-end gap-4">
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="relative active:opacity-80 transition-opacity shrink-0"
                aria-label="Changer l'avatar"
              >
                <Avatar className="w-24 h-24 ring-[5px] ring-background">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full border-[4px] border-background bg-primary flex items-center justify-center">
                  <Camera className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              </button>
            </div>
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAvatar.mutate(file);
            }}
          />
        </section>

        {/* Identity card */}
        <section className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-4 space-y-5">
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
            <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nom d'utilisateur
            </Label>
            <Input
              id="username"
              value={profile?.username || ''}
              disabled
              className="h-11 rounded-xl opacity-60"
            />
            <p className="text-[11px] text-muted-foreground">
              Modifiable depuis Paramètres → Mon compte
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pronouns" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pronoms
            </Label>
            <Input
              id="pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="ex. iel/elle"
              maxLength={40}
              className="h-11 rounded-xl"
            />
          </div>
        </section>

        {/* About card */}
        <section className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-4">
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              À propos de moi
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              maxLength={BIO_MAX}
              rows={8}
              className="rounded-xl resize-none font-mono text-sm"
              placeholder="Parle un peu de toi… Le markdown est supporté : **gras**, *italique*, `code`, > citation, listes, [liens](https://…)"
            />
            <p className="text-[11px] text-muted-foreground text-right">{bio.length}/{BIO_MAX}</p>
          </div>
        </section>

        <div className="h-6" />
      </div>

      {/* Floating Save popup — appears only when there are pending changes */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 500, damping: 32 }}
            className="absolute left-3 right-3 bottom-3 z-50"
          >
            <div className="flex items-center gap-2 rounded-2xl bg-card border border-border shadow-xl p-2 pl-4">
              <span className="text-sm flex-1 truncate text-foreground/90">
                Modifications non enregistrées
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={updateProfile.isPending}
                className="h-9 rounded-full"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="h-9 rounded-full"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
