import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadBanner } from '@/hooks/useProfile';
import { useServers } from '@/hooks/useServers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Camera, Upload, Loader2, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileSettingsProps {
  onClose: () => void;
}

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
    pronouns: (profile as any)?.pronouns || '',
    custom_status: profile?.custom_status || '',
    profile_theme: (profile as any)?.profile_theme || { primary: '#00D4FF', accent: '#8B5CF6' },
    featured_server_id: (profile as any)?.featured_server_id || '',
  });

  const handleSave = () => {
    updateProfile.mutate({
      display_name: formData.display_name,
      bio: formData.bio,
      pronouns: formData.pronouns || null,
      custom_status: formData.custom_status || null,
      profile_theme: formData.profile_theme,
      featured_server_id: formData.featured_server_id || null,
    });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-xl m-4">
        {/* Banner */}
        <div 
          className="h-32 relative rounded-t-xl bg-gradient-to-r"
          style={{
            background: profile?.banner_url
              ? `url(${profile.banner_url}) center/cover`
              : `linear-gradient(135deg, ${formData.profile_theme.primary}, ${formData.profile_theme.accent})`,
          }}
        >
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <Camera className="w-4 h-4" />
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

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className={cn(
                'text-xs',
                bioLength > 200 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {bioLength}/200
              </span>
            </div>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Parlez de vous..."
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Thème du profil</Label>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Couleur principale</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.profile_theme.primary}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      profile_theme: { ...prev.profile_theme, primary: e.target.value }
                    }))}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.profile_theme.primary}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      profile_theme: { ...prev.profile_theme, primary: e.target.value }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Couleur d'accent</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.profile_theme.accent}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      profile_theme: { ...prev.profile_theme, accent: e.target.value }
                    }))}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.profile_theme.accent}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      profile_theme: { ...prev.profile_theme, accent: e.target.value }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="featured_server">Serveur mis en avant</Label>
            <Select
              value={formData.featured_server_id || 'none'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, featured_server_id: value === 'none' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun serveur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {servers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={updateProfile.isPending || bioLength > 200}
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
