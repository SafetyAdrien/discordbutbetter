import { useState, useRef, useCallback } from 'react';
import { useServers } from '@/hooks/useServers';
import { useUpdateServerInfo, useUploadServerIcon, useUploadServerBanner } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, X, ImageIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ImageCropper } from '@/components/ui/image-cropper';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useServerSettings, useUpdateServerSettings } from '@/hooks/useServerSettings';

interface ServerProfileSettingsProps {
  serverId: string;
}

export function ServerProfileSettings({ serverId }: ServerProfileSettingsProps) {
  const queryClient = useQueryClient();
  const { data: servers = [] } = useServers();
  const server = servers.find(s => s.id === serverId);
  const { data: settings } = useServerSettings(serverId);
  
  const updateServer = useUpdateServerInfo();
  const updateSettings = useUpdateServerSettings();
  const uploadIcon = useUploadServerIcon();
  const uploadBanner = useUploadServerBanner();

  const [formData, setFormData] = useState({
    name: server?.name || '',
    description: server?.description || '',
    flexible_channel_names: settings?.flexible_channel_names ?? true,
  });

  // Sync flexible_channel_names when settings load
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  if (settings && !settingsLoaded) {
    setSettingsLoaded(true);
    setFormData(prev => ({ ...prev, flexible_channel_names: settings.flexible_channel_names ?? true }));
  }

  const hasChanges = server && (
    formData.name !== (server.name || '') ||
    formData.description !== (server.description || '') ||
    formData.flexible_channel_names !== (settings?.flexible_channel_names ?? true)
  );

  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [cropperType, setCropperType] = useState<'icon' | 'banner'>('icon');

  const isSaving = updateServer.isPending || updateSettings.isPending;

  const handleSave = () => {
    updateServer.mutate({
      serverId,
      name: formData.name,
      description: formData.description,
    });

    if (formData.flexible_channel_names !== (settings?.flexible_channel_names ?? true)) {
      updateSettings.mutate({
        serverId,
        settings: { flexible_channel_names: formData.flexible_channel_names },
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperImage(reader.result as string);
        setCropperType(type);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    const file = new File([croppedBlob], `${cropperType}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    if (cropperType === 'icon') {
      uploadIcon.mutate({ serverId, file });
    } else {
      uploadBanner.mutate({ serverId, file });
    }
  }, [cropperType, serverId, uploadIcon, uploadBanner]);

  const handleRemoveIcon = async () => {
    try {
      const { error } = await supabase
        .from('servers')
        .update({ icon_url: null })
        .eq('id', serverId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Icône supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRemoveBanner = async () => {
    try {
      const { error } = await supabase
        .from('servers')
        .update({ banner_url: null })
        .eq('id', serverId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Bannière supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!server) return null;

  return (
    <>
      <div className="space-y-8">
        {/* Banner & Icon */}
        <div>
          <Label className="mb-3 block">Apparence du serveur</Label>
          
          {/* Banner */}
          <div className="relative group">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'banner')}
                className="hidden"
              />
              <div 
                className="h-32 rounded-lg bg-muted overflow-hidden flex items-center justify-center"
                style={server.banner_url ? {
                  backgroundImage: `url(${server.banner_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!server.banner_url && (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm">Ajouter une bannière</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-lg bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploadBanner.isPending ? (
                  <Loader2 className="w-8 h-8 animate-spin text-foreground" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-foreground">Modifier la bannière</span>
                  </div>
                )}
              </div>
            </label>
            {server.banner_url && (
              <button
                onClick={handleRemoveBanner}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Icon - centered below banner */}
          <div className="flex justify-center -mt-10">
            <div className="relative group">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'icon')}
                  className="hidden"
                />
                <div className="w-20 h-20 rounded-full bg-card border-4 border-card flex items-center justify-center shadow-lg group-hover:scale-105 transition-all overflow-hidden">
                  {server.icon_url ? (
                    <img src={server.icon_url} alt="Server icon" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-surface-elevated flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {server.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploadIcon.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                  ) : (
                    <Camera className="w-6 h-6 text-foreground" />
                  )}
                </div>
              </label>
              {server.icon_url && (
                <button
                  onClick={handleRemoveIcon}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Nom du Serveur</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Décrivez votre serveur..."
            rows={3}
            maxLength={1000}
          />
        </div>

        {/* Flexible channel names section - inlined */}
        <div className="pt-6 border-t border-border space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
              Noms des salons textuels
            </h3>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <span className="font-medium text-sm">Autoriser des noms de canal de texte flexibles</span>
                <p className="text-xs text-muted-foreground">
                  Quand activé, les noms de salons textuels peuvent contenir des majuscules, des espaces et des caractères spéciaux. Quand désactivé, les noms seront automatiquement formatés en minuscules avec des tirets.
                </p>
              </div>
              <Switch
                checked={formData.flexible_channel_names}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, flexible_channel_names: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Sticky save button */}
        {hasChanges && (
          <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !formData.name.trim()}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder les modifications'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={cropperImage}
        aspectRatio={cropperType === 'icon' ? 1 : 16 / 9}
        circularCrop={cropperType === 'icon'}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
