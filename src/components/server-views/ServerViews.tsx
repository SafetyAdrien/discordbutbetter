import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpDown } from 'lucide-react';
import { Plus, Search, Signpost, TextSearch, Users, Gem, MoreVertical, UserRound, Check, SlidersHorizontal } from '@/components/icons/discord/lucide';
import { useQuery } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ServerBadgeIcon } from '@/components/icons/ServerBadgeIcon';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { LazyBoostBenefitsPage as BoostBenefitsPage } from '@/components/lazy/LazyModals';
import { channelTypeIcon } from '@/components/layout/searchIcons';
import { supabase } from '@/integrations/supabase/client';
import { useServers } from '@/hooks/useServers';
import { useMembers, type MemberWithProfile } from '@/hooks/useMembers';
import { useChannels } from '@/hooks/useChannels';
import { useServerSettings } from '@/hooks/useServerSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { useHiddenChannels, useSetChannelsFollowed, useChannelsLastActivity } from '@/hooks/useHiddenChannels';
import { useServerOnboarding } from '@/hooks/useServerOnboarding';
import { useKickMember, useBanMember } from '@/hooks/useMemberActions';
import { bannerPresetCss } from '@/lib/bannerPresets';
import { cn } from '@/lib/utils';
import { ServerPreviewCard } from './ServerPreviewCard';

/*
 * Vues principales ouvertes depuis les raccourcis du haut de la liste des
 * salons (video de reference) : Guide du serveur, Chercher des salons,
 * Membres et Boosts de serveur. Elles remplacent la zone de discussion.
 */

export type ServerView = 'guide' | 'browse' | 'members' | 'boosts';

const VIEW_META: Record<ServerView, { title: string; icon: React.ElementType }> = {
  guide: { title: 'Guide du serveur', icon: Signpost },
  browse: { title: 'Chercher des salons', icon: TextSearch },
  members: { title: 'Membres', icon: Users },
  boosts: { title: 'Boosts de serveur', icon: Gem },
};

interface ServerViewPageProps {
  view: ServerView;
  serverId: string;
  onOpenChannel: (channelId: string) => void;
  onOpenSettings?: (tab: string) => void;
}

export function ServerViewPage({ view, serverId, onOpenChannel, onOpenSettings }: ServerViewPageProps) {
  const { title, icon: Icon } = VIEW_META[view];
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
      <div className="h-12 px-4 flex items-center gap-2 shrink-0 border-b border-border">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {view === 'guide' && <ServerGuide serverId={serverId} onOpenChannel={onOpenChannel} onOpenSettings={onOpenSettings} />}
        {view === 'browse' && <BrowseChannels serverId={serverId} onOpenChannel={onOpenChannel} />}
        {view === 'members' && <ServerMembers serverId={serverId} />}
        {view === 'boosts' && (
          <div className="px-6 py-6">
            <BoostBenefitsPage serverId={serverId} layout="main" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ guide -- */

function ServerGuide({ serverId, onOpenChannel, onOpenSettings }: { serverId: string; onOpenChannel: (id: string) => void; onOpenSettings?: (tab: string) => void }) {
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const { data: members = [] } = useMembers(serverId);
  const { data: settings } = useServerSettings(serverId);
  const { data: onboarding } = useServerOnboarding(serverId);
  const { data: channelsData } = useChannels(serverId);
  const { hasPermission } = usePermissions(serverId);
  const [invite, setInvite] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  if (!server) return null;

  const channelName = (id: string | null) =>
    id && channelsData ? [...channelsData.orphanChannels, ...channelsData.categories.flatMap((c) => c.channels)].find((c) => c.id === id)?.name : undefined;
  const online = members.filter((m) => m.user.status && m.user.status !== 'offline').length;
  const guide = onboarding?.guide ?? {};
  const hasGuide = !!(guide.welcome || guide.tasks?.length || guide.resources?.length);
  const traits = settings?.profile_traits ?? [];
  const community = !!settings?.community_enabled;

  return (
    <div className="max-w-[1080px] mx-auto px-6 pt-4 pb-10">
      <div className="h-[160px] rounded-xl overflow-hidden" style={{ backgroundImage: server.banner_url ? undefined : bannerPresetCss(settings?.profile_banner_preset) }}>
        {server.banner_url && <img src={server.banner_url} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="px-4">
        <div className="-mt-14 w-[96px] h-[96px] rounded-[28px] ring-[6px] ring-background bg-[hsl(var(--surface-card))] overflow-hidden flex items-center justify-center text-xl font-semibold text-white">
          {server.icon_url && !iconFailed ? <img src={server.icon_url} alt="" className="w-full h-full object-cover" onError={() => setIconFailed(true)} /> : server.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="flex items-center gap-2 text-[28px] font-bold text-white min-w-0">
            <span translate="no" className="truncate">{server.name}</span>
            {community && <ServerBadgeIcon className="w-6 h-6" />}
          </h1>
          <Button variant="secondary" className="ml-auto h-10 px-6" onClick={() => setInvite(true)}>Inviter</Button>
        </div>
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
          {guide.welcome && (
            <div className="rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] p-5">
              <p className="text-lg font-semibold text-white">Bienvenue sur {server.name} !</p>
              <p className="mt-2 text-base text-foreground whitespace-pre-wrap break-words">{guide.welcome}</p>
            </div>
          )}
          {!!guide.tasks?.length && (
            <div>
              <p className="mb-2 text-base font-semibold text-white">Tâches pour les nouveaux membres</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {guide.tasks.map((t) => (
                  <button key={t.id} type="button" onClick={() => t.channel_id && onOpenChannel(t.channel_id)} className="flex items-center gap-3 p-4 rounded-lg bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--interactive-background-hover))] text-left">
                    <span className="text-2xl">{t.emoji ?? '✅'}</span>
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-white truncate">{t.title}</span>
                      {channelName(t.channel_id) && <span className="block text-sm text-muted-foreground truncate">#{channelName(t.channel_id)}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!!guide.resources?.length && (
            <div>
              <p className="mb-2 text-base font-semibold text-white">Ressources</p>
              <div className="space-y-2">
                {guide.resources.map((r) => (
                  <button key={r.id} type="button" onClick={() => r.channel_id && onOpenChannel(r.channel_id)} className="w-full flex items-center gap-3 p-4 rounded-lg bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--interactive-background-hover))] text-left">
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-white truncate">{r.title}</span>
                      {r.description && <span className="block text-sm text-muted-foreground">{r.description}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!hasGuide && hasPermission('manage_server') && onOpenSettings && (
            <div className="rounded-xl border border-dashed border-[hsl(var(--border-subtle))] p-6 text-center">
              <p className="text-base font-semibold text-white">Ton guide est encore vide</p>
              <p className="mt-1 text-sm text-muted-foreground">Ajoute un message de bienvenue, des tâches et des ressources pour orienter les nouveaux membres.</p>
              <Button className="mt-4" onClick={() => onOpenSettings('onboarding')}>Configurer le guide</Button>
            </div>
          )}
        </div>
        <ServerPreviewCard
          className="w-full lg:w-[270px] shrink-0"
          name={server.name}
          iconUrl={server.icon_url}
          bannerUrl={server.banner_url}
          bannerPreset={settings?.profile_banner_preset}
          community={community}
          onlineCount={online}
          memberCount={members.length}
          createdAt={server.created_at}
          traits={traits}
        />
      </div>
      {invite && <CreateInviteModal serverId={serverId} onClose={() => setInvite(false)} />}
    </div>
  );
}

/* ----------------------------------------------------------------- browse -- */

function BrowseChannels({ serverId, onOpenChannel }: { serverId: string; onOpenChannel: (id: string) => void }) {
  const { data: channelsData } = useChannels(serverId);
  const { data: hidden = new Set<string>() } = useHiddenChannels(serverId);
  const { data: lastActivity } = useChannelsLastActivity(serverId);
  const setFollowed = useSetChannelsFollowed(serverId);
  const { hasPermission } = usePermissions(serverId);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => {
    if (!channelsData) return [];
    const q = query.trim().toLowerCase();
    const filter = <T extends { name: string }>(list: T[]) => (q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list);
    return [
      ...(channelsData.orphanChannels.length ? [{ id: 'none', name: 'Sans catégorie', channels: filter(channelsData.orphanChannels) }] : []),
      ...channelsData.categories.map((c) => ({ id: c.id, name: c.name, channels: filter(c.channels) })),
    ].filter((g) => g.channels.length > 0);
  }, [channelsData, query]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des salons"
            className="w-full h-11 pl-9 pr-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none"
          />
        </div>
        {hasPermission('manage_channels') && (
          <Button className="h-11 px-5 gap-1.5 text-base" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Créer
          </Button>
        )}
      </div>

      {groups.map((g) => {
        const ids = g.channels.map((c) => c.id);
        const allFollowed = ids.every((id) => !hidden.has(id));
        return (
          <section key={g.id} className="mt-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-white truncate">{g.name}</h3>
              <label className="ml-auto flex items-center gap-3 text-base text-foreground cursor-pointer">
                Suivre la catégorie
                <Switch checked={allFollowed} onCheckedChange={(v) => setFollowed.mutate({ channelIds: ids, followed: v })} aria-label={`Suivre ${g.name}`} />
              </label>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border-subtle))] overflow-hidden divide-y divide-[hsl(var(--border-subtle))]">
              {g.channels.map((c) => {
                const Icon = channelTypeIcon[c.type ?? 'text'] ?? channelTypeIcon.text;
                const followed = !hidden.has(c.id);
                const last = lastActivity?.get(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-3 min-h-[52px] py-2 bg-[hsl(var(--surface-card))] hover:bg-[hsl(var(--interactive-background-hover))] cursor-pointer" onClick={() => onOpenChannel(c.id)}>
                    <Icon className="w-5 h-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p translate="no" className="text-base font-medium text-white truncate">{c.name}</p>
                      {last && <p className="text-xs text-muted-foreground">Dernière activité {formatDistanceToNow(new Date(last), { addSuffix: true, locale: fr })}</p>}
                    </div>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={followed}
                      aria-label={followed ? `Ne plus suivre ${c.name}` : `Suivre ${c.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFollowed.mutate({ channelIds: [c.id], followed: !followed });
                      }}
                      className={cn('w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors', followed ? 'bg-primary border-primary' : 'border-[hsl(var(--header-icon))]')}
                    >
                      {followed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {groups.length === 0 && <p className="mt-12 text-center text-base text-muted-foreground">Aucun salon ne correspond à ta recherche.</p>}

      {creating && <CreateChannelModal serverId={serverId} categoryId={null} categoryName="" onClose={() => setCreating(false)} />}
    </div>
  );
}

/* ---------------------------------------------------------------- members -- */

type SortKey = 'joined_desc' | 'joined_asc' | 'account_desc' | 'account_asc';

function ServerMembers({ serverId }: { serverId: string }) {
  const { data: members = [] } = useMembers(serverId);
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const { hasPermission, isGod } = usePermissions(serverId);
  const kick = useKickMember();
  const ban = useBanMember();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('joined_desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: accounts } = useQuery({
    queryKey: ['server-member-accounts', serverId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_server_member_accounts', { _server_id: serverId });
      if (error) return new Map<string, { created: string; invite: string | null }>();
      return new Map((data ?? []).map((r) => [r.user_id, { created: r.account_created_at, invite: r.joined_via_invite }]));
    },
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members.filter(
      (m) => !q || m.user.username.toLowerCase().includes(q) || (m.user.display_name ?? '').toLowerCase().includes(q) || m.user.id === q,
    );
    const t = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
    const acc = (m: MemberWithProfile) => t(accounts?.get(m.user.id)?.created);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'joined_asc': return t(a.joined_at) - t(b.joined_at);
        case 'account_desc': return acc(b) - acc(a);
        case 'account_asc': return acc(a) - acc(b);
        default: return t(b.joined_at) - t(a.joined_at);
      }
    });
  }, [members, query, sort, accounts]);

  const ago = (v: string | null | undefined) => (v ? formatDistanceToNow(new Date(v), { addSuffix: true, locale: fr }).replace(/^il y a/, 'Il y a') : '—');
  const canKick = hasPermission('kick_members');
  const canBan = hasPermission('ban_members');
  const actionable = (m: MemberWithProfile) => m.user.id !== server?.owner_id;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.user.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const SortHeader = ({ label, asc, desc }: { label: string; asc: SortKey; desc: SortKey }) => (
    <button type="button" onClick={() => setSort(sort === desc ? asc : desc)} className="flex items-center gap-2 text-left text-sm font-medium text-foreground hover:text-white">
      <span className="leading-4">{label}</span>
      <SlidersHorizontal className={cn('w-4 h-4 shrink-0', (sort === asc || sort === desc) && 'text-white')} />
    </button>
  );

  return (
    <div className="px-4 py-4">
      <div className="rounded-lg border border-[hsl(var(--border-subtle))] overflow-hidden bg-[hsl(var(--background))]">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border-subtle))]">
          <p className="text-base font-semibold text-white">{selected.size ? `${selected.size} sélectionné(s)` : 'Membres récents'}</p>
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && canKick && (
              <Button size="sm" variant="secondary" onClick={() => {
                selected.forEach((id) => kick.mutate({ serverId, userId: id }));
                setSelected(new Set());
              }}>Expulser</Button>
            )}
            {selected.size > 0 && canBan && (
              <Button size="sm" variant="destructive" onClick={() => {
                selected.forEach((id) => ban.mutate({ serverId, userId: id }));
                setSelected(new Set());
              }}>Bannir</Button>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Recherche par nom d'utilisateur ou identifiant" className="w-[230px] h-8 pl-8 pr-2 rounded-md bg-[hsl(var(--search-background))] border border-white/[0.06] text-sm text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none focus:border-primary" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="h-8 gap-1.5"><ArrowUpDown className="w-4 h-4" /> Trier</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Trier par</DropdownMenuLabel>
                {([
                  ['joined_desc', 'Membre depuis : plus récent'],
                  ['joined_asc', 'Membre depuis : plus ancien'],
                  ['account_desc', 'Compte créé : plus récent'],
                  ['account_asc', 'Compte créé : plus ancien'],
                ] as [SortKey, string][]).map(([k, l]) => (
                  <DropdownMenuItem key={k} onSelect={() => setSort(k)} className="justify-between">
                    {l}
                    {sort === k && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" variant="ghost" disabled className="h-8 text-[#f57976]">Congédier</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent><p>Bientôt disponible</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="h-12 border-b border-[hsl(var(--border-subtle))]">
                <th className="w-10 pl-3">
                  <button type="button" role="checkbox" aria-checked={allSelected} aria-label="Tout sélectionner"
                    onClick={() => setSelected(allSelected ? new Set() : new Set(rows.filter(actionable).map((r) => r.user.id)))}
                    className={cn('w-5 h-5 rounded border-2 flex items-center justify-center', allSelected ? 'bg-primary border-primary' : 'border-[hsl(var(--header-icon))]')}>
                    {allSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </button>
                </th>
                <th className="text-sm font-medium text-foreground">Nom</th>
                <th className="w-[120px]"><SortHeader label="Membre depuis" asc="joined_asc" desc="joined_desc" /></th>
                <th className="w-[120px]"><SortHeader label="A rejoint l'app" asc="account_asc" desc="account_desc" /></th>
                <th className="w-[130px] text-sm font-medium text-foreground">Méthode d'adhésion</th>
                <th className="text-sm font-medium text-foreground">Rôles</th>
                <th className="w-[110px] text-sm font-medium text-foreground">Les signalements</th>
                <th className="w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const acc = accounts?.get(m.user.id);
                const roles = m.roles.filter((r) => r.name !== '@everyone');
                return (
                  <tr key={m.id} className="h-14 border-b border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--interactive-background-hover))]">
                    <td className="pl-3">
                      {actionable(m) && (
                        <button type="button" role="checkbox" aria-checked={selected.has(m.user.id)} aria-label={`Sélectionner ${m.user.username}`} onClick={() => toggle(m.user.id)}
                          className={cn('w-5 h-5 rounded border-2 flex items-center justify-center', selected.has(m.user.id) ? 'bg-primary border-primary' : 'border-[hsl(var(--header-icon))]')}>
                          {selected.has(m.user.id) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        {m.user.avatar_url ? <img src={m.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-white">{(m.user.display_name || m.user.username).charAt(0).toUpperCase()}</span>}
                        <div className="min-w-0 leading-tight">
                          <p className="text-sm font-medium text-white truncate">{m.nickname || m.user.display_name || m.user.username}</p>
                          <p translate="no" className="text-xs text-muted-foreground truncate">{m.user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-foreground">{ago(m.joined_at)}</td>
                    <td className="text-sm text-foreground">{acc ? ago(acc.created) : '—'}</td>
                    <td className="text-sm text-muted-foreground">
                      {acc?.invite ? <span className="font-mono text-foreground">{acc.invite}</span> : m.user.id === server?.owner_id ? 'Créateur' : 'Inconnu'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1 py-1">
                        {roles.slice(0, 3).map((r) => (
                          <span key={r.id} className="inline-flex items-center gap-1 h-6 px-2 rounded bg-[hsl(var(--button-secondary))] text-xs text-white">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color ?? '#99aab5' }} />
                            {r.name}
                          </span>
                        ))}
                        {roles.length > 3 && <span className="text-xs text-muted-foreground">+{roles.length - 3}</span>}
                      </div>
                    </td>
                    <td />
                    <td className="pr-3">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="p-1.5 text-[hsl(var(--icon-default))]"><UserRound className="w-4 h-4" /></span>
                          </TooltipTrigger>
                          <TooltipContent><p translate="no">{m.user.username}</p></TooltipContent>
                        </Tooltip>
                        {actionable(m) && (canKick || canBan || isGod) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label="Actions" className="p-1.5 rounded text-[hsl(var(--icon-default))] hover:text-white">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canKick && <DropdownMenuItem className="text-[#f57976]" onSelect={() => kick.mutate({ serverId, userId: m.user.id })}>Expulser {m.user.username}</DropdownMenuItem>}
                              {canBan && <DropdownMenuItem className="text-[#f57976]" onSelect={() => ban.mutate({ serverId, userId: m.user.id })}>Bannir {m.user.username}</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(m.user.id)}>Copier l'identifiant</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-base text-foreground">
          Affichage de <span className="font-semibold text-white">{rows.length}</span> membre{rows.length > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
