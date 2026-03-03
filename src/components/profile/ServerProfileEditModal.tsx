import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useServers } from '@/hooks/useServers';
import { useServerProfile, useUpdateServerProfile, useDeleteServerProfile, useUploadServerAvatar, useUploadServerBanner } from '@/hooks/useServerProfile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, RotateCcw, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseMarkdown } from '@/lib/markdown';

interface ServerProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialServerId?: string;
}

export function ServerProfileEditModal({ open, onOpenChange, initialServerId }: ServerProfileEditModalProps) {
  const { profile } = useAuth();
  const { data: servers = [] } = useServers();
  const [selectedServerId, setSelectedServerId] = useState(initialServerId || '');
  const updateProfile = useUpdateServerProfile();
  const deleteProfile = useDeleteServerProfile();
  const uploadAvatar = useUploadServerAvatar();
  const uploadBanner = useUploadServerBanner();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data: serverProfile, isLoading } = useServerProfile(profile?.id || null, selectedServerId || null);

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    pronouns: '',
    avatar_url: '',
    banner_url: '',
  });

  // Sync form when server profile loads
  useEffect(() => {
    setFormData({
      display_name: serverProfile?.display_name || '',
      bio: serverProfile?.bio || '',
      pronouns: serverProfile?.pronouns || '',
      avatar_url: serverProfile?.avatar_url || '',
      banner_url: serverProfile?.banner_url || '',
    });
  }, [serverProfile]);

  // Set initial server on open
  useEffect(() => {
    if (open && initialServerId) {
      setSelectedServerId(initialServerId);
    }
  }, [open, initialServerId]);

  const handleSave = () => {
    if (!selectedServerId) return;
    const updates: Record<string, string | null> = {};
    if (formData.display_name) updates.display_name = formData.display_name;
    else updates.display_name = null;
    if (formData.bio) updates.bio = formData.bio;
    else updates.bio = null;
    if (formData.pronouns) updates.pronouns = formData.pronouns;
    else updates.pronouns = null;
    if (formData.avatar_url) updates.avatar_url = formData.avatar_url;
    if (formData.banner_url) updates.banner_url = formData.banner_url;

    updateProfile.mutate({ serverId: selectedServerId, updates }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleReset = () => {
    if (!selectedServerId) return;
    deleteProfile.mutate(selectedServerId, {
      onSuccess: () => {
        setFormData({ display_name: '', bio: '', pronouns: '', avatar_url: '', banner_url: '' });
      },
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedServerId) return;
    uploadAvatar.mutate({ serverId: selectedServerId, file }, {
      onSuccess: (url) => setFormData(prev => ({ ...prev, avatar_url: url })),
    });
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedServerId) return;
    uploadBanner.mutate({ serverId: selectedServerId, file }, {
      onSuccess: (url) => setFormData(prev => ({ ...prev, banner_url: url })),
    });
  };

  const displayAvatar = formData.avatar_url || profile?.avatar_url;
  const displayBanner = formData.banner_url || profile?.banner_url;
  const displayName = formData.display_name || profile?.display_name || '';
  

  const bioLength = formData.bio.length;
  const maxBio = 500;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-lg bg-card border-border gap-0">
        {/* Server Selector */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Modifier le profil serveur</h2>
          </div>
          <Select value={selectedServerId} onValueChange={setSelectedServerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un serveur" />
            </SelectTrigger>
            <SelectContent>
              {servers.map(server => (
                <SelectItem key={server.id} value={server.id}>
                  <div className="flex items-center gap-2">
                    {server.icon_url ? (
                      <img src={server.icon_url} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {server.name.charAt(0)}
                      </div>
                    )}
                    <span>{server.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedServerId ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Sélectionnez un serveur pour modifier votre profil
          </div>
        ) : isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[60vh]">
            {/* Banner Preview */}
            <div className="relative h-24 bg-primary">
              {displayBanner && (
                <img src={displayBanner} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                {uploadBanner.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
            </div>

            {/* Avatar */}
            <div className="px-4 -mt-10 relative z-10">
              <div className="relative inline-block">
                <Avatar className="w-20 h-20 border-4 border-card">
                  <AvatarImage src={displayAvatar || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                >
                  {uploadAvatar.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sp_display_name">Nom d'affichage</Label>
                <Input
                  id="sp_display_name"
                  value={formData.display_name}
                  onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder={profile?.display_name || 'Nom d\'affichage global'}
                  maxLength={32}
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour utiliser votre profil global
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp_pronouns">Pronoms</Label>
                <Input
                  id="sp_pronouns"
                  value={formData.pronouns}
                  onChange={e => setFormData(prev => ({ ...prev, pronouns: e.target.value }))}
                  placeholder={profile?.pronouns || 'il/lui, elle, iel...'}
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="sp_bio">Bio</Label>
                  <span className={cn(
                    'text-xs',
                    bioLength > maxBio ? 'text-destructive' : bioLength > maxBio - 50 ? 'text-yellow-500' : 'text-muted-foreground'
                  )}>
                    {bioLength}/{maxBio}
                  </span>
                </div>
                <Textarea
                  id="sp_bio"
                  value={formData.bio}
                  onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={profile?.bio || 'Bio spécifique à ce serveur...'}
                  rows={3}
                  maxLength={maxBio}
                />
                {formData.bio && (
                  <div className="p-2 rounded-md bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Aperçu :</p>
                    <div className="text-sm prose prose-invert prose-sm max-w-none">
                      {parseMarkdown(formData.bio)}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {serverProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={deleteProfile.isPending}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Réinitialiser
                  </Button>
                )}
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateProfile.isPending || !selectedServerId}
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
