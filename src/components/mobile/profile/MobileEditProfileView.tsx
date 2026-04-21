import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { haptics } from '@/lib/haptics';

interface Props {
  onBack: () => void;
}

export function MobileEditProfileView({ onBack }: Props) {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadBanner = useUploadBanner();

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
    updateProfile.mutate(
      {
        display_name: displayName,
        bio,
        pronouns: pronouns || null,
      },
      {
        onSuccess: () => onBack(),
      }
    );
  };

  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();

  return (
    <MobileProfileSubpage
      title="Modifier le profil"
      onBack={onBack}
      rightAction={
        <Button
          size="sm"
          disabled={!hasChanges || updateProfile.isPending}
          onClick={handleSave}
          className="mr-2 h-8 rounded-full"
        >
          {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
        </Button>
      }
    >
      {/* Banner + avatar */}
      <section className="relative">
        <button
          onClick={() => bannerRef.current?.click()}
          className="relative w-full h-32 block group"
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

        <div className="px-4 -mt-12 relative">
          <button
            onClick={() => avatarRef.current?.click()}
            className="relative inline-block"
            aria-label="Changer l'avatar"
          >
            <Avatar className="w-24 h-24 ring-[5px] ring-background">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-background border-[3px] border-background flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            </div>
          </button>
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
        </div>
      </section>

      {/* Form fields */}
      <section className="px-4 mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="display_name">Nom d'affichage</Label>
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
          <Label htmlFor="username">Nom d'utilisateur</Label>
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
          <Label htmlFor="pronouns">Pronoms</Label>
          <Input
            id="pronouns"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            placeholder="ex. iel/elle"
            maxLength={40}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">À propos de moi</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={5}
            className="rounded-xl resize-none"
            placeholder="Parle un peu de toi…"
          />
          <p className="text-[11px] text-muted-foreground text-right">{bio.length}/200</p>
        </div>
      </section>
    </MobileProfileSubpage>
  );
}
