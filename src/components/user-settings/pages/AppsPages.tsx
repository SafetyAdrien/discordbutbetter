import { useMemo, useState } from 'react';
import { BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Search, X } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfile';
import { useServers } from '@/hooks/useServers';
import { useUserSettings } from '@/hooks/useUserSettings';
import { CONNECTION_PROVIDERS, CONNECTION_PROVIDERS_BY_ID, formatConnectionDisplay, type ProfileConnection } from '@/lib/connections';
import { cn } from '@/lib/utils';
import { UBanner, UButton, URadioGroup, URelated, USection, UToggle } from '../UserSettingsUI';
import { useUserSettingsNav } from '../UserSettingsNavContext';

/* -------------------------------------------- Confidentialite des activites -- */

export function ActivityPage() {
  const { settings, update } = useUserSettings();
  const { goTo } = useUserSettingsNav();
  const { data: servers = [] } = useServers();
  const [query, setQuery] = useState('');
  const p = settings.privacy;
  const list = servers.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <USection id="act-what" title="Quelle activité je partage">
        <UToggle soon checked={false} title="Partager mon activité" description="Partage des informations concernant les jeux et applications connectés que j'utilise." />
        <UToggle soon checked={false} title="Partager quand je me connecte en ligne" description="Autorise tes ami(e)s à recevoir une notification lorsque tu te connectes en ligne." />
        <UToggle soon checked={false} title="Partager quand je commence à streamer" />
      </USection>

      <USection id="act-where" title="Où je partage l'activité">
        <URadioGroup
          label="Partager mon activité automatiquement lorsque je rejoins un serveur"
          description="Bientôt disponible : l'activité des jeux connectés n'existe pas encore dans l'app."
          value={p.activity_servers}
          onChange={(v) => update({ privacy: { activity_servers: v } })}
          disabled
          options={[
            { value: 'all', label: 'Partager dans tous les serveurs' },
            { value: 'small', label: 'Partage dans les Serveurs avec 200 Membres ou moins' },
            { value: 'none', label: 'Ne partager sur aucun serveur' },
          ]}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans mes serveurs"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground outline-none"
          />
        </div>
        <div className="space-y-1 opacity-60">
          {list.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-1.5">
              {s.icon_url ? <img src={s.icon_url} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <span className="w-10 h-10 rounded-xl bg-[hsl(var(--surface-card))] flex items-center justify-center text-sm font-semibold text-white">{s.name.slice(0, 2)}</span>}
              <span className="flex-1 min-w-0 truncate text-base font-medium text-white">{s.name}</span>
            </div>
          ))}
        </div>
        <URelated icon={<ShieldCheck className="w-5 h-5" />} title="Données et confidentialité" description="Contrôle qui peut voir tes informations de profil, comme ta bio et tes comptes connectés." onClick={() => goTo('privacy', 'privacy-profile')} />
      </USection>

      <USection id="act-join" title="Qui peut rejoindre mes parties ?" description="Certains jeux permettent aux utilisateurs de rejoindre le jeu auquel tu joues lorsqu'ils regardent ton Activité.">
        <UToggle soon checked={false} title="Autoriser mes amis à rejoindre ma partie" />
        <UToggle soon checked={false} title="Autoriser les participants du salon vocal à rejoindre ma partie" />
      </USection>
    </>
  );
}

/* ------------------------------------------------ Applications connectees -- */

export function ConnectionsPage() {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const current = useMemo<ProfileConnection[]>(() => {
    const raw = (profile as { connections?: unknown } | null)?.connections;
    return Array.isArray(raw) ? (raw as ProfileConnection[]) : [];
  }, [profile]);
  const [provider, setProvider] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [appQuery, setAppQuery] = useState('');
  const save = (next: ProfileConnection[]) => updateProfile.mutate({ connections: next } as never);
  const p = provider ? CONNECTION_PROVIDERS_BY_ID[provider] : null;

  return (
    <>
      <USection
        id="conn-connections"
        title="Connexions"
        description="Ce sont les comptes des autres plateformes. Les connecter ici permet de les afficher sur ton profil."
      >
        <div>
          <p className="mb-3 text-base font-medium text-white">Ajouter une nouvelle connexion</p>
          <div className="flex flex-wrap gap-2">
            {CONNECTION_PROVIDERS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => {
                    setProvider(c.id);
                    setValue('');
                  }}
                  className="w-12 h-12 rounded-lg bg-[hsl(var(--surface-card))] hover:bg-[hsl(var(--interactive-background-selected))] flex items-center justify-center text-white transition-colors"
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-base font-medium text-white">{current.length} connexion{current.length > 1 ? 's' : ''}</p>
        <div className="space-y-3">
          {current.map((c, i) => {
            const prov = CONNECTION_PROVIDERS_BY_ID[c.provider];
            if (!prov) return null;
            const Icon = prov.icon;
            return (
              <div key={`${c.provider}-${i}`} className="rounded-lg bg-[hsl(var(--surface-card))] border border-white/[0.06]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Icon className="w-6 h-6 text-white shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="flex items-center gap-1.5 text-base font-semibold text-white truncate">
                      {formatConnectionDisplay(c)}
                      {c.stats?.is_verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{prov.label}</p>
                  </div>
                  <button type="button" aria-label="Supprimer la connexion" onClick={() => save(current.filter((_, j) => j !== i))} className="p-1 text-[hsl(var(--icon-default))] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-4 py-3 border-t border-white/[0.06]">
                  <UToggle title="Afficher sur mon profil" checked onChange={() => undefined} disabled />
                </div>
              </div>
            );
          })}
        </div>
      </USection>

      <USection id="conn-apps" title="Applications autorisées" description="Cela inclut les services tiers auxquels tu as donné la permission d'accéder à ton compte. Tu peux consulter ce que chaque application peut faire et révoquer leur accès à tout moment.">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={appQuery}
            onChange={(e) => setAppQuery(e.target.value)}
            placeholder="Rechercher les applications installées"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground outline-none"
          />
        </div>
        <div className="py-10 rounded-lg bg-[hsl(var(--surface-card))] text-center">
          <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-base font-semibold text-white">Aucune application autorisée</p>
          <p className="mt-1 text-sm text-muted-foreground">Les applications tierces que tu autorises apparaîtront ici.</p>
        </div>
      </USection>

      <Dialog open={!!p} onOpenChange={(o) => !o && setProvider(null)}>
        <DialogContent className="sm:max-w-[440px] p-6 gap-0">
          <DialogTitle className="text-xl font-semibold text-white">Connecte ton compte {p?.label}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">Indique ton identifiant {p?.label} : il s'affichera sur ton profil.</DialogDescription>
          <label className="block mt-5 mb-2 text-xs font-semibold uppercase text-foreground">Identifiant</label>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={p?.placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim() && provider) {
                save([...current, { provider, value: value.trim() }]);
                setProvider(null);
              }
            }}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground outline-none"
          />
          <div className="mt-6 flex justify-end gap-2">
            <UButton onClick={() => setProvider(null)}>Annuler</UButton>
            <UButton
              tone="primary"
              disabled={!value.trim() || updateProfile.isPending}
              onClick={() => {
                if (!provider) return;
                save([...current, { provider, value: value.trim() }]);
                setProvider(null);
              }}
            >
              Suivant
            </UButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------- Developpeur -- */

export function DeveloperPage() {
  const { settings, update } = useUserSettings();
  return (
    <USection id="developer-main">
      <UToggle
        title="Mode développeur"
        description="Le Mode développeur révèle des éléments du menu contextuel utiles pour les personnes qui écrivent des applications, comme « Copier l'identifiant » sur les messages et les serveurs."
        checked={settings.developer.dev_mode}
        onChange={(c) => update({ developer: { dev_mode: c } })}
      />
      <UToggle soon checked={false} title="Mode de test d'application" description="Saisis ton identifiant d'application pour activer le mode de test pour cette application." />
      {!settings.developer.dev_mode && <UBanner>Les options « Copier l'identifiant » sont masquées tant que le mode développeur est désactivé.</UBanner>}
      <div className={cn('pt-2 text-xs text-muted-foreground')}>Version web · {import.meta.env.MODE}</div>
    </USection>
  );
}
