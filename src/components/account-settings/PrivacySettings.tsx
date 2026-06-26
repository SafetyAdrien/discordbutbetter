import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, MessageSquare, UserPlus, Eye, Download, Camera, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DownloadPermissionsSettings } from './DownloadPermissionsSettings';

export function PrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    allowDMsFromEveryone: true,
    allowFriendRequestsFromEveryone: true,
    showOnlineStatus: true,
    showCurrentActivity: true,
  });
  const [notifyScreenshotCapture, setNotifyScreenshotCapture] = useState<boolean>(true);
  const [view, setView] = useState<'main' | 'downloads'>('main');

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notify_screenshot_capture')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled && data && typeof (data as any).notify_screenshot_capture === 'boolean') {
        setNotifyScreenshotCapture((data as any).notify_screenshot_capture);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateScreenshotNotify = async (checked: boolean) => {
    setNotifyScreenshotCapture(checked); // optimistic
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ notify_screenshot_capture: checked } as any)
      .eq('id', user.id);
    if (error) {
      setNotifyScreenshotCapture(!checked);
      console.error('[privacy] update notify_screenshot_capture failed', error);
    }
  };

  if (view === 'downloads') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('main')}
          className="-ml-2"
        >
          ← Retour
        </Button>
        <DownloadPermissionsSettings />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DM Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages privés
          </CardTitle>
          <CardDescription>Contrôlez qui peut vous envoyer des messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Autoriser les messages de tout le monde</Label>
              <p className="text-sm text-muted-foreground">
                Permettre aux membres des serveurs partagés de vous envoyer des messages
              </p>
            </div>
            <Switch
              checked={settings.allowDMsFromEveryone}
              onCheckedChange={(checked) => updateSetting('allowDMsFromEveryone', checked)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Notifier les captures d'écran
              </Label>
              <p className="text-sm text-muted-foreground">
                Un message système est publié dans la conversation lorsqu'une capture ou un enregistrement
                d'écran est détecté sur mobile. Activé par défaut.
              </p>
            </div>
            <Switch
              checked={notifyScreenshotCapture}
              onCheckedChange={updateScreenshotNotify}
            />
          </div>
        </CardContent>
      </Card>

      {/* Friend Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Demandes d'ami
          </CardTitle>
          <CardDescription>Gérez les demandes d'ami entrantes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Qui peut m'envoyer des demandes d'ami</Label>
            <Select defaultValue="everyone">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Tout le monde</SelectItem>
                <SelectItem value="friends_of_friends">Amis d'amis uniquement</SelectItem>
                <SelectItem value="server_members">Membres des serveurs uniquement</SelectItem>
                <SelectItem value="nobody">Personne</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Statut d'activité
          </CardTitle>
          <CardDescription>Contrôlez ce que les autres peuvent voir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Afficher mon statut en ligne</Label>
              <p className="text-sm text-muted-foreground">
                Les autres pourront voir quand vous êtes en ligne
              </p>
            </div>
            <Switch
              checked={settings.showOnlineStatus}
              onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Afficher l'activité en cours</Label>
              <p className="text-sm text-muted-foreground">
                Montrer le jeu ou l'application que vous utilisez
              </p>
            </div>
            <Switch
              checked={settings.showCurrentActivity}
              onCheckedChange={(checked) => updateSetting('showCurrentActivity', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Download permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="w-5 h-5" />
            Téléchargement de mon contenu
          </CardTitle>
          <CardDescription>
            Choisissez qui peut télécharger votre avatar, votre bannière et vos pièces jointes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => setView('downloads')}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-accent transition-colors"
          >
            <span className="text-sm font-medium">Gérer la liste d'autorisation</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Data Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Confidentialité des données
          </CardTitle>
          <CardDescription>Gérez vos données personnelles</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vos données sont stockées de manière sécurisée. Vous pouvez demander une copie de vos données ou supprimer votre compte dans la section "Mon compte".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
