import { useState, useEffect, useMemo } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { ProfileTabsPane } from './ProfileTabsPane';
import { ProfileActionsMenu } from './ProfileActionsMenu';
import { FriendStateButton } from './FriendStateButton';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { InlineBadgeStrip } from '@/components/badges/InlineBadgeStrip';
import { X, MessageCircle, ExternalLink } from '@/components/icons/discord/lucide';
import { useImageGuardProps } from '@/hooks/useDownloadPermissions';
import { useMutualServers } from '@/hooks/useMutualServers';
import { useMutualFriends } from '@/hooks/useMutualFriends';
import { useCreateDMConversation, useDMConversations } from '@/hooks/useDMs';
import { useRelationTo } from '@/hooks/useFriends';
import { useUserNote, useSaveUserNote } from '@/hooks/useUserNotes';
import { useRelations } from '@/hooks/useRelations';
import { useFullProfile } from '@/hooks/useFullProfile';
import { useAuth } from '@/contexts/AuthContext';
import { format, fr } from '@/lib/dateUtils';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { profileTheme } from '@/lib/profileTheme';
import { CONNECTION_PROVIDERS_BY_ID, formatConnectionDisplay, formatStatCount, getConnectionUrl, type ProfileConnection } from '@/lib/connections';
import { toast } from 'sonner';
import { useIsBirthday } from '@/hooks/useBirthday';
import { BirthdayRibbon } from '@/components/profile/BirthdayRibbon';
import { ConfettiCanvas } from '@/components/effects/ConfettiCanvas';

/*
 * Profil complet d'un utilisateur (video de reference) : fenetre aux couleurs du theme du profil. A gauche la carte
 * (banniere et avatar fixes, le reste defile : nom, pseudo • pronoms, tag, badges, Envoyer un message / ami / "...",
 * a propos, Membre depuis, Ami(e)s depuis le, Connexions, Note), a droite les onglets (Tableau, Activite, Liste de
 * souhaits, amis en commun, serveurs en commun).
 */

export interface FullProfileUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  status: string;
  created_at?: string | null;
  pronouns?: string | null;
  custom_status?: string | null;
  activity_type?: string | null;
  activity_text?: string | null;
  connections?: Array<{ provider: string; value: string }> | null;
}

interface FullUserProfileModalProps {
  user: FullProfileUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToDM?: (conversationId: string) => void;
  initialTab?: 'about' | 'servers' | 'friends';
}

const BRAND: Record<string, [string, string]> = {
  twitter: ['#ffffff', '#000000'],
  bluesky: ['#ffffff', '#1185fe'],
  github: ['#ffffff', '#000000'],
  reddit: ['#ff4500', '#ffffff'],
  spotify: ['#1db954', '#000000'],
  twitch: ['#9146ff', '#ffffff'],
  xbox: ['#107c10', '#ffffff'],
  youtube: ['#ff0000', '#ffffff'],
  steam: ['#1b2838', '#ffffff'],
  instagram: ['#e1306c', '#ffffff'],
  discord: ['#5865f2', '#ffffff'],
};

const shortDate = (iso: string) => format(new Date(iso), 'd MMM yyyy', { locale: fr });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="text-xs font-medium leading-4 text-[#e6f0fa]">{label}</h4>
      <div className="mt-2 text-sm leading-[18px] text-white">{children}</div>
    </section>
  );
}

function ConnectionRow({ c }: { c: ProfileConnection }) {
  const provider = CONNECTION_PROVIDERS_BY_ID[c.provider];
  const Icon = provider?.icon;
  const [bg, fg] = BRAND[c.provider] ?? ['rgba(255,255,255,0.12)', '#ffffff'];
  const url = getConnectionUrl(c);
  const stats = c.stats;
  const name = <span translate="no" className="text-sm font-medium leading-[18px]">{formatConnectionDisplay(c)}</span>;
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: bg, color: fg }}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-white hover:underline">
            {name}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          name
        )}
        {stats?.account_created_at && <p className="text-xs leading-4 text-[#c7d3e6]">Membre depuis {shortDate(stats.account_created_at)}</p>}
        {(stats?.posts_count != null || stats?.followers_count != null) && (
          <p className="text-[10px] leading-3 text-[#c7d3e6]">
            {stats?.posts_count != null && <span className="mr-2">{formatStatCount(stats.posts_count)} posts</span>}
            {stats?.followers_count != null && <span>{formatStatCount(stats.followers_count)} abonnés</span>}
          </p>
        )}
      </div>
    </li>
  );
}

export function FullUserProfileModal({ user: given, open, onOpenChange, onNavigateToDM, initialTab }: FullUserProfileModalProps) {
  const { user: currentUser } = useAuth();
  const { data: full } = useFullProfile(open ? given?.id : null);
  const user = useMemo(() => (given ? { ...given, ...(full ?? {}), connections: full?.connections ?? given.connections ?? [] } : null), [given, full]);
  const isOwnProfile = currentUser?.id === user?.id;
  const theme = profileTheme(full);

  const { data: mutualServers } = useMutualServers(open && !isOwnProfile ? user?.id ?? null : null);
  const { data: mutualFriends } = useMutualFriends(open && !isOwnProfile ? user?.id ?? null : null);
  const { data: conversations = [] } = useDMConversations();
  const createDM = useCreateDMConversation();
  const { row: friendship, isFriend } = useRelationTo(user?.id);
  const { data: userNote } = useUserNote(user?.id || null);
  const { saveWithDebounce } = useSaveUserNote();
  const { nameFor } = useRelations();
  const bannerGuard = useImageGuardProps(isOwnProfile ? null : user?.id ?? null);
  const isBirthday = useIsBirthday(user?.id ?? null);

  const [noteInput, setNoteInput] = useState('');
  useEffect(() => setNoteInput(userNote?.content ?? ''), [userNote?.content, user?.id]);
  const handleNoteChange = (value: string) => {
    setNoteInput(value);
    if (user?.id) saveWithDebounce(user.id, value);
  };

  const [birthdayConfetti, setBirthdayConfetti] = useState(false);
  useEffect(() => {
    if (open && isBirthday) {
      setBirthdayConfetti(false);
      const t = window.setTimeout(() => setBirthdayConfetti(true), 200);
      return () => window.clearTimeout(t);
    }
  }, [open, isBirthday, user?.id]);

  const [tab, setTab] = useState<string>('board');
  useEffect(() => {
    if (open) setTab(initialTab === 'friends' ? 'mutual-friends' : initialTab === 'servers' ? 'mutual-servers' : 'board');
  }, [open, initialTab, user?.id]);

  const handleSendMessage = async () => {
    if (!user) return;
    const existing = conversations.find((c) => !c.is_group && c.participants.some((p) => p.id === user.id));
    if (existing) {
      onNavigateToDM?.(existing.id);
      onOpenChange(false);
      return;
    }
    try {
      const result = await createDM.mutateAsync(user.id);
      onNavigateToDM?.(result.conversation_id);
      onOpenChange(false);
    } catch {
      toast.error('Impossible de créer la conversation');
    }
  };

  if (!user) return null;

  const renderedBio = user.bio
    ? (() => {
        const prev = getMarkdownContext();
        setMarkdownContext({ ...prev, variant: 'bio' });
        const out = parseMarkdown(user.bio);
        setMarkdownContext(prev);
        return out;
      })()
    : null;
  const card = theme?.card ?? '#383840';
  const backdrop = theme?.backdrop ?? 'hsl(var(--background))';
  const accentHue = theme ? Number(/hsl\((\d+)/.exec(theme.card)?.[1] ?? 220) : 235;
  const primaryButton = theme ? `hsl(${(accentHue + 14) % 360} 100% 29%)` : 'hsl(var(--primary))';
  const displayName = nameFor(user.id, user.display_name);
  const rowBase = 'flex items-center gap-3 rounded-lg px-2 hover:bg-white/[0.05] transition-colors';

  const extraTabs = isOwnProfile
    ? []
    : [
        {
          id: 'mutual-friends',
          label: mutualFriends ? `${mutualFriends.length} ami${mutualFriends.length > 1 ? 's' : ''} en commun` : 'Amis en commun',
          content:
            !mutualFriends || mutualFriends.length === 0 ? (
              <p className="px-2 text-sm text-[#c7d3e6]">Aucun ami en commun.</p>
            ) : (
              <div>
                {mutualFriends.map((f) => (
                  <div key={f.id} className={cn(rowBase, 'h-[58px]')}>
                    <span className="relative shrink-0">
                      <UserAvatarImage src={f.avatar_url} alt="" className="h-8 w-8" fallbackClassName="text-sm" fallback={f.display_name.charAt(0).toUpperCase()} ownerId={f.id} />
                      <StatusIndicator status={f.status || 'offline'} className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 border-[3px] border-[var(--pback)]" bgClassName="bg-[var(--pback)]" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span translate="no" className="truncate text-base font-medium leading-5 text-white">{nameFor(f.id, f.display_name)}</span>
                        <ServerTagBadge userId={f.id} variant="compact" interactive={false} />
                      </span>
                      {f.custom_status && <span translate="no" className="block truncate text-xs leading-4 text-[#c7d3e6]">{f.custom_status}</span>}
                    </span>
                  </div>
                ))}
              </div>
            ),
        },
        {
          id: 'mutual-servers',
          label: mutualServers ? `${mutualServers.length} serveur${mutualServers.length > 1 ? 's' : ''} en commun` : 'Serveurs en commun',
          content:
            !mutualServers || mutualServers.length === 0 ? (
              <p className="px-2 text-sm text-[#c7d3e6]">Aucun serveur en commun.</p>
            ) : (
              <div>
                {mutualServers.map((s) => (
                  <div key={s.id} className={cn(rowBase, 'h-[60px]')}>
                    <UserAvatarImage src={s.icon_url} alt="" className="h-10 w-10 !rounded-xl" fallbackClassName="text-sm !rounded-xl" fallback={s.name.charAt(0).toUpperCase()} />
                    <span className="min-w-0">
                      <span translate="no" className="block truncate text-base font-medium leading-5 text-white">{s.name}</span>
                      {s.nickname && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs leading-4 text-[#c7d3e6]">
                          <UserAvatarImage src={user.avatar_url} alt="" className="h-3.5 w-3.5" fallbackClassName="text-[7px]" fallback={user.display_name.charAt(0).toUpperCase()} />
                          <span translate="no" className="truncate">{s.nickname}</span>
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ),
        },
      ];

  return (
    <>
      {birthdayConfetti && (
        <ConfettiCanvas active count={90} duration={3000} colors={['hsl(45, 95%, 58%)', 'hsl(38, 95%, 60%)', 'hsl(50, 100%, 65%)', 'hsl(30, 100%, 55%)']} onComplete={() => setBirthdayConfetti(false)} />
      )}
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            style={{ backgroundColor: backdrop, '--pback': backdrop, '--pcard': card } as React.CSSProperties}
            className="fixed left-1/2 top-1/2 z-[100] flex h-[calc(100vh-94px)] max-h-[860px] w-[930px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/[0.05] shadow-[0_8px_24px_rgba(0,0,0,0.4)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 md:flex-row"
          >
            <DialogPrimitive.Title className="sr-only">Profil de {displayName}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Fermer" className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-white transition-colors hover:bg-white/[0.14]">
              <X className="h-[14px] w-[14px]" />
            </DialogPrimitive.Close>

            {/* Carte de profil : banniere + avatar fixes, le reste defile. */}
            <div className="relative flex min-h-0 shrink-0 flex-col max-md:max-h-[60%] md:ml-[46px] md:mt-[47px] md:w-[387px]">
              {isBirthday && <BirthdayRibbon displayName={user.display_name} />}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg" style={{ backgroundColor: card }}>
                <div className="relative shrink-0" {...bannerGuard}>
                  <div
                    className="h-[135px]"
                    style={{
                      backgroundColor: user.banner_url ? undefined : theme?.accent ?? 'hsl(var(--primary))',
                      backgroundImage: user.banner_url ? `url(${user.banner_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <span className="absolute left-8 top-[77px] rounded-full border-[8px] border-[var(--pcard)] bg-[var(--pcard)]">
                    <UserAvatarImage src={user.avatar_url} alt="" className="h-[100px] w-[100px]" fallbackClassName="text-4xl" fallback={user.display_name.charAt(0).toUpperCase()} ownerId={user.id} />
                    <StatusIndicator status={user.status || 'offline'} className="absolute -bottom-1 -right-1 h-[34px] w-[34px] border-[7px] border-[var(--pcard)]" bgClassName="bg-[var(--pcard)]" />
                  </span>
                  <div className="h-[58px]" />
                </div>

                <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-8 pb-6 pt-5">
                  <h3 translate="no" className="break-words text-2xl font-bold leading-6 text-white">{displayName}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-base leading-[22px] text-white">
                    <span translate="no">{user.username}</span>
                    {user.pronouns && (
                      <>
                        <span aria-hidden>•</span>
                        <span translate="no">{user.pronouns}</span>
                      </>
                    )}
                    <ServerTagBadge userId={user.id} variant="profile" interactive={false} />
                    <InlineBadgeStrip userId={user.id} max={8} className="w-fit justify-start rounded-md bg-white/[0.07] px-1.5 py-1" />
                  </div>

                  {!isOwnProfile && (
                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSendMessage()}
                        disabled={createDM.isPending}
                        style={{ backgroundColor: primaryButton, boxShadow: theme ? `inset 0 0 0 1px ${theme.accent}55` : undefined }}
                        className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white transition-[filter] hover:brightness-110"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Envoyer un message
                      </button>
                      <FriendStateButton user={user} variant="square" className="!rounded-md" />
                      <ProfileActionsMenu
                        profile={user}
                        trigger={
                          <button type="button" aria-label="Plus" className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.08] text-white transition-colors hover:bg-white/[0.12]">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                          </button>
                        }
                      />
                    </div>
                  )}

                  {renderedBio && <div className="mt-5 break-words text-sm leading-[18px] text-white markdown-preview max-w-none [&_*]:leading-[18px] [&_a]:text-[#00a8fc]">{renderedBio}</div>}

                  {user.created_at && <Field label="Membre depuis">{shortDate(user.created_at)}</Field>}
                  {isFriend && friendship?.created_at && <Field label="Ami(e)s depuis le">{shortDate(friendship.created_at)}</Field>}
                  {user.connections && user.connections.length > 0 && (
                    <Field label="Connexions">
                      <ul className="space-y-3 pt-1">
                        {user.connections.map((c, i) => <ConnectionRow key={`${c.provider}-${i}`} c={c as ProfileConnection} />)}
                      </ul>
                    </Field>
                  )}
                  {!isOwnProfile && (
                    <section className="mt-5">
                      <h4 className="text-xs font-medium leading-4 text-[#e6f0fa]">Note (seulement visible par toi)</h4>
                      <input
                        value={noteInput}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        placeholder="Clique pour ajouter une note"
                        maxLength={256}
                        className="mt-2 h-8 w-full rounded-[4px] border border-white/20 bg-transparent px-1.5 text-xs italic text-white outline-none placeholder:text-[#c7d3e6] focus:border-white/40 focus:not-italic"
                      />
                    </section>
                  )}
                </div>
              </div>
            </div>

            {/* Onglets */}
            <ProfileTabsPane
              bare
              className="min-w-0 flex-1 px-7 pb-4 pt-[57px] max-md:px-4 max-md:pt-4"
              key={`${user.id}-${open}`}
              initialTab={tab}
              userId={user.id}
              voiceUser={{ id: user.id, display_name: user.display_name, avatar_url: user.avatar_url }}
              isOwn={isOwnProfile}
              activity={{ type: user.activity_type, text: user.activity_text }}
              activityEmpty={
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
                  <h3 translate="no" className="text-base font-medium leading-5 text-white">{user.display_name} n'a aucune activité à partager ici</h3>
                  {!isOwnProfile && (
                    <>
                      <p className="mt-1.5 max-w-[280px] text-sm leading-[18px] text-white">Oooh, ça joue les timides ! 👉👈... Dis-lui coucou pour briser la glace</p>
                      <button type="button" onClick={() => void handleSendMessage()} className="mt-5 flex h-8 items-center gap-1.5 rounded-md bg-white/[0.08] px-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]">
                        <MessageCircle className="h-4 w-4" />
                        Envoyer un MP
                      </button>
                    </>
                  )}
                </div>
              }
              extraTabs={extraTabs}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
