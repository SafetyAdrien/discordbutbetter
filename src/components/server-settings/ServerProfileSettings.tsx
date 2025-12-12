import { useState, useRef } from 'react';
import { useServers } from '@/hooks/useServers';
import { useUpdateServerInfo, useUploadServerIcon, useUploadServerBanner } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';

interface ServerProfileSettingsProps {
  serverId: string;
}

export function ServerProfileSettings({ serverId }: ServerProfileSettingsProps) {
  const { data: servers = [] } = useServers();
  const server = servers.find(s => s.id === serverId);
  
  const updateServer = useUpdateServerInfo();
  const uploadIcon = useUploadServerIcon();
  const uploadBanner = useUploadServerBanner();

  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: server?.name || '',
    description: server?.description || '',
  });

  const handleSave = () => {
    updateServer.mutate({
      serverId,
      name: formData.name,
      description: formData.description,
    });
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadIcon.mutate({ serverId, file });
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBanner.mutate({ serverId, file });
    }
  };

  if (!server) return null;

  return (
    <div className="space-y-8">
      {/* Banner & Icon */}
      <div>
        <Label className="mb-3 block">Apparence du serveur</Label>
        <div 
          className="h-32 relative rounded-lg bg-muted"
          style={{
            background: server.banner_url
              ? `url(${server.banner_url}) center/cover`
              : undefined,
          }}
        >
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            {uploadBanner.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="hidden"
          />
        </div>

        <div className="-mt-10 ml-4 relative inline-block">
          <Avatar className="w-20 h-20 border-4 border-card">
            <AvatarImage src={server.icon_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {server.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => iconInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {uploadIcon.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            onChange={handleIconChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom du serveur</Label>
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

      {/* Save button */}
      <Button 
        onClick={handleSave} 
        disabled={updateServer.isPending || !formData.name.trim()}
      >
        {updateServer.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enregistrement...
          </>
        ) : (
          'Enregistrer les modifications'
        )}
      </Button>
    </div>
  );
}
