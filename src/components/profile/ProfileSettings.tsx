import { useState, useRef } from 'react';
import { ServerProfileEditModal } from '@/components/profile/ServerProfileEditModal';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner } from '@/hooks/useProfile';
import { useServers } from '@/hooks/useServers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Camera, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseMarkdown } from '@/lib/markdown';

interface ProfileSettingsProps {
  onClose: () => void;
}

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
  const { data: servers = [] } = useServers();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadBanner = useUploadBanner();
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    pronouns: profile?.pronouns || '',
    custom_status: profile?.custom_status || '',
    activity_type: profile?.activity_type || 'none',
    activity_text: profile?.activity_text || '',
    theme_color: profile?.theme_color || '#00D4FF',
    theme_gradient: profile?.theme_gradient || '',
  });

  const [useGradient, setUseGradient] = useState(!!profile?.theme_gradient);
  const [gradientStart, setGradientStart] = useState(profile?.theme_gradient?.split(',')[0] || '#00D4FF');
  const [gradientEnd, setGradientEnd] = useState(profile?.theme_gradient?.split(',')[1] || '#8B5CF6');

  const handleSave = () => {
    const themeGradient = useGradient ? `${gradientStart},${gradientEnd}` : null;
    
    updateProfile.mutate({
      display_name: formData.display_name,
      bio: formData.bio,
      pronouns: formData.pronouns || null,
      custom_status: formData.custom_status || null,
      activity_type: formData.activity_type === 'none' ? null : formData.activity_type,
      activity_text: formData.activity_text || null,
      theme_color: useGradient ? null : formData.theme_color,
      theme_gradient: themeGradient,
    } as any);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar.mutate(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBanner.mutate(file);
    }
  };

  const bioLength = formData.bio.length;
  const maxBio = 500;

  const getBannerStyle = () => {
    if (profile?.banner_url) {
      return { background: `url(${profile.banner_url}) center/cover` };
    }
    if (useGradient) {
      return { background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` };
    }
    return { background: formData.theme_color };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-xl m-4">
        {/* Banner */}
        <div className="h-32 relative rounded-t-xl" style={getBannerStyle()}>
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            {uploadBanner.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="hidden"
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 left-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="px-6 -mt-12 relative z-10">
          <div className="relative inline-block">
            <Avatar className="w-24 h-24 border-4 border-card">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile?.display_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nom d'affichage</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pronouns">Pronoms</Label>
              <Input
                id="pronouns"
                value={formData.pronouns}
                onChange={(e) => setFormData(prev => ({ ...prev, pronouns: e.target.value }))}
                placeholder="il/lui, elle, iel..."
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom_status">Statut personnalisé</Label>
            <Input
              id="custom_status"
              value={formData.custom_status}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_status: e.target.value }))}
              placeholder="En train de jouer..."
              maxLength={128}
            />
          </div>

          {/* Activity / Rich Presence */}
          <div className="space-y-3">
            <Label>Activité (Rich Presence)</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={formData.activity_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, activity_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type d'activité" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={formData.activity_text}
                onChange={(e) => setFormData(prev => ({ ...prev, activity_text: e.target.value }))}
                placeholder={formData.activity_type === 'streaming' ? 'URL du stream' : 'Nom du jeu/activité'}
                disabled={formData.activity_type === 'none'}
                maxLength={128}
              />
            </div>
          </div>

          {/* Bio with Markdown */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="bio">Bio (Markdown supporté)</Label>
              <span className={cn(
                'text-xs',
                bioLength > maxBio ? 'text-destructive' : bioLength > maxBio - 50 ? 'text-yellow-500' : 'text-muted-foreground'
              )}>
                {bioLength}/{maxBio}
              </span>
            </div>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Parlez de vous... (supporte **gras**, *italique*, [liens](url))"
              rows={4}
              maxLength={maxBio}
            />
            {formData.bio && (
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">Aperçu:</p>
                <div className="text-sm prose prose-invert prose-sm max-w-none">
                  {parseMarkdown(formData.bio)}
                </div>
              </div>
            )}
          </div>

          {/* Theme */}
          <div className="space-y-3">
            <Label>Thème du profil</Label>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useGradient}
                  onChange={() => setUseGradient(false)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Couleur unie</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useGradient}
                  onChange={() => setUseGradient(true)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Dégradé</span>
              </label>
            </div>
            
            {!useGradient ? (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={formData.theme_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                  className="flex-1"
                  placeholder="#00D4FF"
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    placeholder="Début"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    placeholder="Fin"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={updateProfile.isPending || bioLength > maxBio}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}