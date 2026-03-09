import { useState, useEffect } from 'react';
import { useServers } from '@/hooks/useServers';
import { useUpdateServerInfo } from '@/hooks/useServerAssets';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Globe, Lock, Loader2 } from 'lucide-react';

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

  const hasChanges = server && isPublic !== (server.is_public || false);

  const handleSave = () => {
    updateServer.mutate({
      serverId,
      is_public: isPublic,
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
          onCheckedChange={setIsPublic}
        />
      </div>

      {/* Sticky save button */}
      {hasChanges && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent">
          <Button 
            onClick={handleSave} 
            disabled={updateServer.isPending}
            className="w-full"
          >
            {updateServer.isPending ? (
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
  );
}
