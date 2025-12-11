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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfileSettingsTab() {
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
    <div className="space-y-6">
      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aperçu du profil</CardTitle>
          <CardDescription>Voici comment les autres verront votre profil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border border-border">
            {/* Banner */}
            <div 
              className="h-24 relative bg-gradient-to-r cursor-pointer group"
              onClick={() => bannerInputRef.current?.click()}
              style={{
                background: profile?.banner_url
                  ? `url(${profile.banner_url}) center/cover`
                  : `linear-gradient(135deg, ${formData.profile_theme.primary}, ${formData.profile_theme.accent})`,
              }}
            >
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
              />
            </div>

            {/* Avatar & Info */}
            <div className="px-4 pb-4 bg-card">
              <div className="relative -mt-10 mb-3">
                <div className="relative inline-block">
                  <Avatar className="w-20 h-20 border-4 border-card">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {profile?.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    {uploadAvatar.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
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
              <h3 className="font-semibold text-lg">{formData.display_name || profile?.display_name}</h3>
              <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              {formData.bio && (
                <p className="text-sm mt-2">{formData.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personnalisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              value={formData.featured_server_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, featured_server_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun serveur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {servers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateProfile.isPending || bioLength > 200}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
