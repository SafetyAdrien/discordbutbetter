import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, MessageSquare, UserPlus, Eye, Download, Camera, ChevronRight, Cake } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const [birthday, setBirthday] = useState<string>('');
  const [birthdayPublic, setBirthdayPublic] = useState<boolean>(false);
  const [birthdaySaving, setBirthdaySaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notify_screenshot_capture')
        .eq('id', user.id)
        .maybeSingle();
      // Birthday columns are not readable via the table API (privacy); use the owner-only RPC.
      const { data: bd } = await (supabase.rpc as never as (fn: string) => Promise<{ data: unknown }>)('get_my_birthday');
      if (!cancelled) {
        const d = (data ?? {}) as { notify_screenshot_capture?: boolean | null };
        if (typeof d.notify_screenshot_capture === 'boolean') setNotifyScreenshotCapture(d.notify_screenshot_capture);
        const row = (Array.isArray(bd) ? bd[0] : bd) as
          | { birthday?: string | null; birthday_public?: boolean | null }
          | undefined;
        if (row?.birthday) setBirthday(row.birthday);
        if (typeof row?.birthday_public === 'boolean') setBirthdayPublic(row.birthday_public);
      }

    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const saveBirthday = async (nextDate: string | null, nextPublic: boolean) => {
    if (!user?.id) return;
    setBirthdaySaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ birthday: nextDate, birthday_public: nextPublic } as never)
      .eq('id', user.id);
    setBirthdaySaving(false);
    if (error) console.error('[privacy] update birthday failed', error);
  };

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

      {/* Birthday */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cake className="w-5 h-5" />
            Anniversaire
          </CardTitle>
          <CardDescription>
            Le jour J, un badge festif, une couronne dorée sur ton avatar et des confettis
            sur ton profil apparaîtront pour toi et les autres. L'année n'est jamais partagée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="birthday-date">Date de naissance</Label>
            <Input
              id="birthday-date"
              type="date"
              value={birthday}
              disabled={birthdaySaving}
              onChange={(e) => {
                const v = e.target.value;
                setBirthday(v);
                void saveBirthday(v || null, birthdayPublic);
              }}
              className="max-w-xs"
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="space-y-0.5">
              <Label>Célébrer publiquement mon anniversaire</Label>
              <p className="text-sm text-muted-foreground">
                Désactivé par défaut. Active pour permettre aux autres de voir la couronne
                festive et le bandeau sur ton profil le jour J.
              </p>
            </div>
            <Switch
              checked={birthdayPublic}
              disabled={birthdaySaving || !birthday}
              onCheckedChange={(checked) => {
                setBirthdayPublic(checked);
                void saveBirthday(birthday || null, checked);
              }}
            />
          </div>
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
