import { useEffect, useState } from 'react';
import { Contact, Palette, Loader2 } from 'lucide-react';
import { CheckCircle2, ChevronRight, UserRound, Shield } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useServers } from '@/hooks/useServers';
import { DownloadPermissionsSettings } from '@/components/account-settings/DownloadPermissionsSettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UBanner, UButton, URadioGroup, URelated, URow, USection, USelect, UToggle } from '../UserSettingsUI';
import { useUserSettingsNav } from '../UserSettingsNavContext';

const inputCls =
  'w-full h-10 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground outline-none';

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  return `${'*'.repeat(name.length)}@${domain ?? ''}`;
}

type EditField = 'username' | 'email' | 'password' | null;

/* ---------------------------------------------------------------- Compte -- */

export function AccountPage() {
  const { profile, user, updateProfile } = useAuth();
  const { goTo } = useUserSettingsNav();
  const [showEmail, setShowEmail] = useState(false);
  const [edit, setEdit] = useState<EditField>(null);
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [busy, setBusy] = useState(false);
  const [ageBanner, setAgeBanner] = useState(true);
  const email = user?.email ?? '';

  const open = (f: EditField) => {
    setEdit(f);
    setValue(f === 'username' ? profile?.username ?? '' : '');
    setValue2('');
  };

  const save = async () => {
    setBusy(true);
    try {
      if (edit === 'username') {
        const name = value.trim().toLowerCase();
        if (!name || name === profile?.username) return setEdit(null);
        const { data: ok, error } = await supabase.rpc('check_username_availability', { p_username: name });
        if (error) throw error;
        if (!ok) return toast.error("Ce nom d'utilisateur est déjà pris");
        await updateProfile({ username: name });
      } else if (edit === 'email') {
        const { error } = await supabase.auth.updateUser({ email: value.trim() });
        if (error) throw error;
        toast.success('Un e-mail de confirmation a été envoyé à ta nouvelle adresse');
      } else if (edit === 'password') {
        if (value.length < 6) return toast.error('Le mot de passe doit contenir au moins 6 caractères');
        if (value !== value2) return toast.error('Les mots de passe ne correspondent pas');
        const { error } = await supabase.auth.updateUser({ password: value });
        if (error) throw error;
        toast.success('Mot de passe modifié');
      }
      setEdit(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setBusy(false);
    }
  };

  const signOutOthers = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) toast.error('Impossible de déconnecter les autres appareils');
    else toast.success('Tous tes autres appareils ont été déconnectés');
  };

  return (
    <>
      <USection id="account-info" title="Infos du compte">
        <URow title="Nom d'utilisateur">
          <div className="flex items-center gap-4">
            <span translate="no" className="text-base text-foreground">{profile?.username}</span>
            <UButton onClick={() => open('username')}>Modifier</UButton>
          </div>
        </URow>
        <URow title="E-mail">
          <div className="flex items-center gap-4">
            <span className="text-base text-foreground">
              {showEmail ? email : maskEmail(email)}{' '}
              <button type="button" onClick={() => setShowEmail((v) => !v)} className="text-[hsl(var(--text-link))] hover:underline">
                {showEmail ? 'Masquer' : 'Afficher'}
              </button>
            </span>
            <UButton onClick={() => open('email')}>Modifier</UButton>
          </div>
        </URow>
        <URow title="Numéro de téléphone" soon description="Aucun numéro de téléphone n'est associé à ton compte." />
      </USection>

      <USection id="account-security" title="Mot de passe et sécurité">
        <URow title="Mot de passe">
          <UButton onClick={() => open('password')}>Modifier</UButton>
        </URow>
        <URow title="Authentification multi-facteurs" soon>
          <span className="text-base text-muted-foreground">Désactivée</span>
        </URow>
        <URow title="Appareils connectés" description="Déconnecte toutes les sessions ouvertes sur d'autres navigateurs et appareils.">
          <UButton onClick={signOutOthers}>Déconnecter les autres appareils</UButton>
        </URow>
      </USection>

      <USection id="account-status" title="Statut du compte">
        {ageBanner && (
          <UBanner onDismiss={() => setAgeBanner(false)}>
            Les groupes d'âge déterminent si tu peux accéder au contenu et aux paramètres destinés aux adultes.
          </UBanner>
        )}
        <div className="flex items-center gap-4">
          <span className="w-10 h-10 shrink-0 rounded-lg bg-[hsl(var(--surface-card))] flex items-center justify-center"><UserRound className="w-5 h-5 text-white" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-white">Groupe d'âge</p>
            <p className="text-sm text-muted-foreground">La vérification de l'âge n'est pas encore disponible dans l'app.</p>
          </div>
          <span className="text-sm font-medium text-muted-foreground">Non vérifié</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-10 h-10 shrink-0 rounded-lg bg-[hsl(var(--surface-card))] flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-[hsl(var(--online))]" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-white">Statut du compte</p>
            <p className="text-sm text-muted-foreground">
              Merci de respecter les <a href="/terms" className="text-[hsl(var(--text-link))] hover:underline">Conditions d'Utilisation</a>. Si tu enfreins les règles, cela s'affichera ici.
            </p>
          </div>
          <span className="text-sm font-medium text-white">C'est tout bon !</span>
        </div>
      </USection>

      <USection id="account-family" title="Centre familial">
        <URow title="Configurer le centre familial" soon description="Reste informé(e) de l'expérience de ton ado : consulte son activité et gère ses paramètres de sécurité clés.">
          <ChevronRight className="w-5 h-5 text-[hsl(var(--icon-default))]" />
        </URow>
        <div className="pt-4 border-t border-white/[0.06] space-y-5">
          <URow title="Désactive ton compte" soon description="Désactive temporairement ton compte.">
            <UButton tone="danger-outline" disabled>Désactiver le compte</UButton>
          </URow>
          <URow title="Ferme ton compte" soon description="Ferme définitivement ton compte.">
            <UButton tone="danger" disabled>Supprimer le compte</UButton>
          </URow>
        </div>
        <URelated icon={<Palette className="w-5 h-5" />} title="Profils" description="Modifie ton avatar, ta bannière, ta bio et tes profils de serveur." onClick={() => goTo('profile')} />
      </USection>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-[440px] p-6 gap-0">
          <DialogTitle className="text-xl font-semibold text-white text-center">
            {edit === 'username' ? "Modifie ton nom d'utilisateur" : edit === 'email' ? 'Modifie ton adresse e-mail' : 'Modifie ton mot de passe'}
          </DialogTitle>
          <DialogDescription className="mt-2 mb-5 text-sm text-muted-foreground text-center">
            {edit === 'email' ? 'Saisis une nouvelle adresse e-mail : un lien de confirmation y sera envoyé.' : edit === 'password' ? 'Choisis un mot de passe d\'au moins 6 caractères.' : "Les lettres sont converties en minuscules."}
          </DialogDescription>
          <label className="block mb-2 text-sm font-semibold text-foreground">
            {edit === 'username' ? "Nom d'utilisateur" : edit === 'email' ? 'E-mail' : 'Nouveau mot de passe'}
          </label>
          <input autoFocus type={edit === 'password' ? 'password' : edit === 'email' ? 'email' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} />
          {edit === 'password' && (
            <>
              <label className="block mt-4 mb-2 text-sm font-semibold text-foreground">Confirmer le nouveau mot de passe</label>
              <input type="password" value={value2} onChange={(e) => setValue2(e.target.value)} className={inputCls} />
            </>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <UButton onClick={() => setEdit(null)}>Annuler</UButton>
            <UButton tone="primary" disabled={busy || !value.trim()} onClick={save}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Terminé'}
            </UButton>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

/* --------------------------------------------- Donnees et confidentialite -- */

type Visibility = 'private' | 'friends' | 'everyone';
const VIS_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'private', label: 'Moi uniquement' },
  { value: 'friends', label: 'Mes amis' },
  { value: 'everyone', label: 'Tout le monde' },
];

export function PrivacyPage() {
  const { user } = useAuth();
  const { settings, update } = useUserSettings();
  const { goTo } = useUserSettingsNav();
  const [birthday, setBirthday] = useState('');
  const [birthdayVis, setBirthdayVis] = useState<Visibility>('private');
  const [badgeVis, setBadgeVis] = useState<Visibility>('everyone');
  const [screenshot, setScreenshot] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('notify_screenshot_capture, badge_visibility' as never).eq('id', user.id).maybeSingle();
      const { data: bd } = await (supabase.rpc as never as (fn: string) => Promise<{ data: unknown }>)('get_my_birthday');
      if (cancelled) return;
      const d = (data ?? {}) as { notify_screenshot_capture?: boolean | null; badge_visibility?: Visibility | null };
      if (typeof d.notify_screenshot_capture === 'boolean') setScreenshot(d.notify_screenshot_capture);
      if (d.badge_visibility) setBadgeVis(d.badge_visibility);
      const row = (Array.isArray(bd) ? bd[0] : bd) as { birthday?: string | null; birthday_visibility?: Visibility | null } | undefined;
      if (row?.birthday) setBirthday(row.birthday);
      if (row?.birthday_visibility) setBirthdayVis(row.birthday_visibility);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const saveBirthday = async (date: string | null, vis: Visibility) => {
    if (!user?.id) return;
    const { error } = await (supabase.from('user_birthdays' as never) as never as {
      upsert: (v: unknown, o: unknown) => Promise<{ error: unknown }>;
    }).upsert({ user_id: user.id, birthday: date, birthday_visibility: vis, birthday_public: vis === 'everyone' }, { onConflict: 'user_id' });
    if (error) toast.error("Impossible d'enregistrer ton anniversaire");
  };
  const saveProfileField = async (patch: Record<string, unknown>, rollback: () => void) => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update(patch as never).eq('id', user.id);
    if (error) {
      rollback();
      toast.error("Impossible d'enregistrer ce paramètre");
    }
  };

  return (
    <>
      <USection id="privacy-data" title="Comment l'app utilise mes données">
        <URow
          title="Utiliser les données pour que l'app fonctionne"
          description="L'app a besoin de stocker et traiter des données afin de te fournir ses fonctionnalités de base telles que les messages, les serveurs dans lesquels tu es et tes messages privés. Elle ne s'en sert pas pour de la publicité ni pour personnaliser du contenu sponsorisé."
        />
        <UToggle soon checked={false} title="Utiliser les données pour améliorer l'app" description="Permet à l'app d'utiliser tes informations afin de comprendre et améliorer ses services." />
        <UToggle soon checked={false} title="Utiliser mes données pour personnaliser mon expérience" description="Autorise l'app à utiliser tes informations (comme tes interlocuteurs) afin de la personnaliser rien que pour toi." />
      </USection>

      <USection id="privacy-profile" title="Confidentialité du profil" description="Contrôle qui peut voir tes informations de profil, comme ta bio et tes comptes connectés.">
        <URadioGroup
          label="Partager mon profil complet avec"
          value={settings.privacy.profile_sharing}
          onChange={(v) => update({ privacy: { profile_sharing: v } })}
          disabled
          options={[
            { value: 'all', label: 'Ami(e)s et tous les serveurs', description: 'Ton profil complet est visible pour tes ami(e)s et tous les serveurs que tu rejoins.' },
            { value: 'small', label: 'Ami(e)s et petits serveurs uniquement', description: 'Ton profil complet est visible pour tes ami(e)s et tous les serveurs de 200 membres et moins. Toutes les autres personnes n\'en voient qu\'une version limitée.' },
            { value: 'friends', label: 'Ami(e)s uniquement', description: "Ton profil complet est visible pour tes ami(e)s. Toutes les autres personnes n'en voient qu'une version limitée." },
          ]}
        />
        <p className="text-xs text-muted-foreground">Bientôt disponible : aujourd'hui, ton profil complet est visible par les membres de tes serveurs.</p>
        <URelated icon={<Contact className="w-5 h-5" />} title="Confidentialité des activités" description="Détermine comment ton activité est partagée et qui peut la voir." onClick={() => goTo('activity')} />
      </USection>

      <USection id="privacy-personal" title="Anniversaire et badges">
        <URow title="Date de naissance" description="Utilisée pour la célébration d'anniversaire et le badge du jour J.">
          <input
            type="date"
            value={birthday}
            onChange={(e) => {
              setBirthday(e.target.value);
              saveBirthday(e.target.value || null, birthdayVis);
            }}
            className={cn(inputCls, 'w-[180px]')}
          />
        </URow>
        <URow title="Qui peut voir mon anniversaire">
          <div className="w-[200px]">
            <USelect value={birthdayVis} options={VIS_OPTIONS} onChange={(v) => { setBirthdayVis(v); saveBirthday(birthday || null, v); }} />
          </div>
        </URow>
        <URow title="Qui peut voir mes badges">
          <div className="w-[200px]">
            <USelect
              value={badgeVis}
              options={VIS_OPTIONS}
              onChange={(v) => {
                const prev = badgeVis;
                setBadgeVis(v);
                saveProfileField({ badge_visibility: v }, () => setBadgeVis(prev));
              }}
            />
          </div>
        </URow>
        <UToggle
          title="Me prévenir des captures d'écran"
          description="Reçois une notification quand quelqu'un fait une capture d'écran de tes contenus protégés."
          checked={screenshot}
          onChange={(v) => {
            setScreenshot(v);
            saveProfileField({ notify_screenshot_capture: v }, () => setScreenshot(!v));
          }}
        />
      </USection>

      <USection id="privacy-downloads" title="Téléchargements" description="Choisis qui peut télécharger les médias que tu partages.">
        <DownloadPermissionsSettings />
      </USection>
    </>
  );
}

/* --------------------------------------------- Permissions de messagerie -- */

export function MessagingPage() {
  const { settings, update } = useUserSettings();
  const { goTo } = useUserSettingsNav();
  const { data: servers = [] } = useServers();
  const fr = settings.privacy.friend_requests;
  const setFr = (k: keyof typeof fr, v: boolean) =>
    update({ privacy: { friend_requests: k === 'everyone' && v ? { everyone: true, friends_of_friends: true, server_members: true } : { [k]: v, ...(k !== 'everyone' && !v ? { everyone: false } : {}) } } });

  return (
    <>
      <USection id="msg-filters" title="Filtres de contenu">
        <URow soon title="Filtres de contenu sensible" description="Choisis la façon dont tu veux voir le contenu média à base d'images détecté par les filtres de contenu sensible." />
        <div className="grid grid-cols-[180px_1fr] gap-4 opacity-60">
          <div className="space-y-1">
            <p className="px-2 py-1.5 rounded border-l-2 border-primary text-sm font-medium text-[#949cf7]">Contenu média sexuel mature</p>
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Contenu média violent</p>
          </div>
          <div className="space-y-3">
            {['Messages privés des amis', "Messages privés d'autrui", 'Messages dans les salons du serveur'].map((l) => (
              <div key={l} className="flex items-center justify-between text-sm text-white">
                {l}
                <span className="text-muted-foreground">Montrer</span>
              </div>
            ))}
          </div>
        </div>
        <UToggle soon checked={false} title="Autoriser l'accès aux commandes des applications soumises à une limite d'âge dans les MP" />
        <URelated icon={<Palette className="w-5 h-5" />} title="Apparence" description="Afficher/masquer le contenu média dans le chat et les spoilers" onClick={() => goTo('appearance', 'app-messages')} />
      </USection>

      <USection id="msg-spam" title="Filtres de spam">
        <URadioGroup
          label="Filtrer automatiquement les messages de spam suspectés"
          description="Bientôt disponible : l'app ne détecte pas encore les spams automatiquement."
          value="non_friends"
          onChange={() => undefined}
          disabled
          options={[
            { value: 'all', label: 'Filtrer tous les spams' },
            { value: 'non_friends', label: 'Filtrer les messages des personnes qui ne sont pas des Amis (Recommandé)' },
            { value: 'none', label: 'Ne pas filtrer les spams' },
          ]}
        />
      </USection>

      <USection id="msg-dms" title="Permissions de messages privés (MP)">
        <USelect value="all" options={[{ value: 'all', label: 'Tous les serveurs', hint: `${servers.length} serveur${servers.length > 1 ? 's' : ''}` }]} onChange={() => undefined} icon={<Shield className="w-4 h-4 text-primary" />} />
        <UToggle
          title="Messages privés"
          description="Autoriser les MP des autres membres de serveurs. Désactivé, seuls tes ami(e)s peuvent t'écrire en privé."
          checked={settings.privacy.allow_server_dms}
          onChange={(v) => update({ privacy: { allow_server_dms: v } })}
        />
        <UToggle soon checked={false} title="Demandes de message" description="Filtre les messages venant des membres du serveur que tu pourrais ne pas connaître." />
      </USection>

      <USection id="msg-friends" title="Permissions des demandes d'ami" description="Contrôle qui peut t'envoyer des demandes d'ami.">
        <p className="text-base font-medium text-white">Autoriser les demandes d'ami de...</p>
        <UToggle title="Tout le monde" checked={fr.everyone} onChange={(v) => setFr('everyone', v)} />
        <UToggle title="Amis d'amis" checked={fr.friends_of_friends} onChange={(v) => setFr('friends_of_friends', v)} />
        <UToggle title="Membres du serveur" description="Les personnes avec qui tu partages un serveur." checked={fr.server_members} onChange={(v) => setFr('server_members', v)} />
      </USection>

      <USection id="msg-games" title="Messagerie dans les jeux connectés" description="Ce sont les paramètres pour les jeux qui utilisent l'app pour leurs expériences sociales.">
        <div className="py-8 rounded-lg bg-[hsl(var(--surface-card))] text-center">
          <p className="text-base font-semibold text-white">Aucun jeu connecté</p>
          <p className="mt-1 text-sm text-muted-foreground">Les jeux connectés ne sont pas encore pris en charge.</p>
        </div>
      </USection>
    </>
  );
}

/* --------------------------------------------------------- Notifications -- */

export function NotificationsPage() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  return (
    <>
      <USection id="notif-overview" title="Vue d'ensemble">
        <URow
          title="Activer les notifications sur le bureau"
          description={
            permission === 'denied'
              ? 'Ton navigateur bloque les notifications de ce site : autorise-les dans les paramètres du navigateur.'
              : permission === 'granted'
                ? 'Ton navigateur autorise les notifications de ce site.'
                : "Autorise ton navigateur à afficher les notifications de l'app."
          }
        >
          <UButton
            tone={permission === 'granted' ? 'secondary' : 'primary'}
            disabled={permission !== 'default'}
            onClick={async () => setPermission(await Notification.requestPermission())}
          >
            {permission === 'granted' ? 'Autorisées' : permission === 'unsupported' ? 'Non prises en charge' : permission === 'denied' ? 'Bloquées' : 'Autoriser'}
          </UButton>
        </URow>
        <p className="text-base font-medium text-white">Envoyez-moi une notification quand...</p>
        <UToggle soon checked={false} title="Des personnes que je connais commencent à streamer en direct dans de petits serveurs" />
        <UToggle soon checked={false} title="Des ami(e)s se connectent en ligne" />
        <UToggle soon checked={false} title="Un événement aura bientôt lieu dans un serveur" />
        <UToggle soon checked={false} title="Des ami(e)s mettent leur profil à jour" />
      </USection>
      <USection id="notif-sounds" title="Sons">
        <UToggle soon checked={false} title="Nouveau message" />
        <UToggle soon checked={false} title="Nouveau message dans le salon dans lequel je suis actuellement" />
        <UToggle soon checked={false} title="Appel entrant" />
      </USection>
      <USection id="notif-badges" title="Badges">
        <UToggle soon checked={false} title="Activer l'icône de messages non lus" description="Affiche un badge sur l'onglet de l'app quand des messages non lus t'attendent." />
      </USection>
      <USection id="notif-email" title="E-mail">
        <UToggle soon checked={false} title="E-mails de communication" description="Reçois des e-mails pour chaque appel manqué, message ou message condensé." />
        <UToggle soon checked={false} title="E-mails sociaux" description="Reçois des e-mails pour les demandes d'amis et les événements de ton serveur." />
        <UToggle soon checked={false} title="E-mails d'annonces et de mise à jour" />
      </USection>
      <USection id="notif-advanced" title="Avancés">
        <URow soon title="Afficher les paramètres de notification avancés" description="Délai des notifications sur mobile, lecture des commandes /tts et plus encore." />
      </USection>
    </>
  );
}
