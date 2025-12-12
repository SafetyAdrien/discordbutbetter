import { useState, useEffect } from 'react';
import { useServers } from '@/hooks/useServers';
import { useUpdateServerInfo } from '@/hooks/useServerAssets';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Lock } from 'lucide-react';

interface PrivacySettingsProps {
  serverId: string;
}

export function PrivacySettings({ serverId }: PrivacySettingsProps) {
  const { data: servers = [] } = useServers();
  const server = servers.find(s => s.id === serverId);
  const updateServer = useUpdateServerInfo();

  const [isPublic, setIsPublic] = useState(server?.is_public || false);

  useEffect(() => {
    if (server) {
      setIsPublic(server.is_public || false);
    }
  }, [server]);

  const handleToggle = (checked: boolean) => {
    setIsPublic(checked);
    updateServer.mutate({
      serverId,
      is_public: checked,
    });
  };

  if (!server) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Confidentialité du serveur</h3>
        <p className="text-sm text-muted-foreground">
          Gérez la visibilité de votre serveur
        </p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          {isPublic ? (
            <Globe className="w-5 h-5 text-primary mt-0.5" />
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
          )}
          <div>
            <Label htmlFor="is_public" className="cursor-pointer font-medium">
              Serveur public
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isPublic 
                ? "Votre serveur est visible dans la découverte et accessible à tous"
                : "Votre serveur est privé et accessible uniquement via invitation"
              }
            </p>
          </div>
        </div>
        <Switch
          id="is_public"
          checked={isPublic}
          onCheckedChange={handleToggle}
          disabled={updateServer.isPending}
        />
      </div>
    </div>
  );
}
