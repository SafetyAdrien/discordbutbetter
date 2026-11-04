import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { InlineBadgeStrip } from '@/components/badges/InlineBadgeStrip';
import { FriendStateButton } from '@/components/profile/FriendStateButton';
import { ProfileActionsMenu } from '@/components/profile/ProfileActionsMenu';
import { useMutualServers } from '@/hooks/useMutualServers';
import { useMutualFriends } from '@/hooks/useMutualFriends';
import { useFullProfile } from '@/hooks/useFullProfile';
import { useRelations } from '@/hooks/useRelations';
import { profileTheme } from '@/lib/profileTheme';
import { format, fr } from '@/lib/dateUtils';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';

export interface DMParticipant {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  status: string;
  created_at?: string | null;
}

export type ProfileFocus = 'friends' | 'servers';

interface DMUserInfoPanelProps {
  participant: DMParticipant;
  onViewFullProfile: (focus?: ProfileFocus) => void;
  onOpenNotes?: () => void;
  /** Utilisateur bloque : le profil est floute derriere "Afficher le profil ?". */
  blocked?: boolean;
}

const CIRCLE = 'flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70';

/*
 * Panneau de profil d'un MP (video de reference) : carte arrondie a droite de la conversation, aux couleurs du theme
 * du profil (fond, contour d'accent), banniere avec boutons ami et "...", avatar chevauchant, nom, identifiant •
 * pronoms et tag, badges, amis / serveurs en commun, a propos (3 lignes puis "Afficher la bio complete"), "Membre
 * depuis" et "Voir le profil complet".
 */
export function DMUserInfoPanel({ participant, onViewFullProfile, blocked = false }: DMUserInfoPanelProps) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [participant.id, blocked]);
  const covered = blocked && !revealed;
  const { data: full, isError } = useFullProfile(participant.id);
  const { data: mutualServers = [] } = useMutualServers(participant.id);
  const { data: mutualFriends = [] } = useMutualFriends(participant.id);
  const { nameFor } = useRelations();
  const profile = { ...participant, ...(full ?? {}) };
  const theme = profileTheme(full);
  const status = full?.status ?? participant.status ?? 'offline';
  const memberSince = profile.created_at ? format(new Date(profile.created_at), 'd MMM yyyy', { locale: fr }) : null;
  const card = theme?.card ?? 'hsl(var(--surface-1))';

  const bioRef = useRef<HTMLDivElement>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [bioClamped, setBioClamped] = useState(false);
  useLayoutEffect(() => {
    const el = bioRef.current;
    if (el && !bioOpen) setBioClamped(el.scrollHeight > el.clientHeight + 1);
  }, [profile.bio, bioOpen]);

  return (
    <div className="flex w-[318px] shrink-0 flex-col pb-2 pl-4 pr-2 pt-2.5 max-lg:hidden">
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg"
        style={{ '--pcard': card, backgroundColor: card, boxShadow: theme ? `inset 0 0 0 2px ${theme.accent}` : undefined } as React.CSSProperties}
      >
        <div className={cn('scrollbar-thin min-h-0 flex-1 overflow-y-auto', covered && 'pointer-events-none select-none blur-[10px]')} aria-hidden={covered}>
          <div
            className="relative h-[102px]"
            style={{
              backgroundColor: profile.banner_url ? undefined : theme?.accent ?? '#5865f2',
              backgroundImage: profile.banner_url ? `url(${profile.banner_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute right-2.5 top-2.5 flex items-center gap-2">
              <FriendStateButton user={profile} variant="round" />
              <ProfileActionsMenu
                profile={profile}
                align="end"
                trigger={
                  <button type="button" aria-label="Plus" className={CIRCLE}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                  </button>
                }
              />
            </div>
          </div>

          <div className="relative px-4">
            <span className="relative -mt-[46px] inline-block rounded-full border-[6px] border-[var(--pcard)] bg-[var(--pcard)]">
              <UserAvatarImage src={profile.avatar_url} alt="" className="h-[70px] w-[70px]" fallbackClassName="text-2xl" fallback={profile.display_name.charAt(0).toUpperCase()} ownerId={profile.id} />
              <StatusIndicator status={status} className="absolute -bottom-[2px] -right-[2px] h-[22px] w-[22px] border-[4px] border-[var(--pcard)]" bgClassName="bg-[var(--pcard)]" />
            </span>

            {isError && (
              <div role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-3 text-sm leading-[18px] text-white">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-[#f0b232]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3.5l9.5 16.5h-19L12 3.5z" strokeLinejoin="round" /><path d="M12 10v4.5M12 17.2v.3" strokeLinecap="round" /></svg>
                Impossible de charger une partie du profil
              </div>
            )}
            <h3 translate="no" className="mt-2 break-words text-xl font-semibold leading-6 text-white">{nameFor(profile.id, profile.display_name)}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-[18px] text-[#dbdee1]">
              <span translate="no">{profile.username}</span>
              {full?.pronouns && (
                <>
                  <span aria-hidden>•</span>
                  <span translate="no">{full.pronouns}</span>
                </>
              )}
              <ServerTagBadge userId={profile.id} variant="profile" interactive={false} />
            </div>
            <InlineBadgeStrip userId={profile.id} max={8} className="mt-2 w-fit justify-start rounded-md bg-white/[0.07] px-1.5 py-1" />

            {(mutualFriends.length > 0 || mutualServers.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-4 text-[#c7d3e6]">
                {mutualFriends.length > 0 && (
                  <button type="button" onClick={() => onViewFullProfile('friends')} className="flex items-center gap-1.5 hover:underline">
                    <span className="flex -space-x-1.5">
                      {mutualFriends.slice(0, 3).map((f) => (
                        <UserAvatarImage key={f.id} src={f.avatar_url} alt="" className="h-4 w-4 ring-2 ring-[var(--pcard)]" fallbackClassName="text-[8px]" fallback={f.display_name.charAt(0).toUpperCase()} ownerId={f.id} />
                      ))}
                    </span>
                    {mutualFriends.length} ami{mutualFriends.length > 1 ? 's' : ''} en commun
                    <span aria-hidden>•</span>
                  </button>
                )}
                {mutualServers.length > 0 && (
                  <button type="button" onClick={() => onViewFullProfile('servers')} className="hover:underline">
                    {mutualServers.length} serveur{mutualServers.length > 1 ? 's' : ''} en commun
                  </button>
                )}
              </div>
            )}

            {profile.bio && (
              <div className="mt-5">
                <div ref={bioRef} className={cn('break-words text-sm leading-[18px] text-white [&_a]:text-[#00a8fc]', !bioOpen && 'line-clamp-3')}>
                  {(() => {
                    const prev = getMarkdownContext();
                    setMarkdownContext({ ...prev, variant: 'bio' });
                    const out = parseMarkdown(profile.bio);
                    setMarkdownContext(prev);
                    return out;
                  })()}
                </div>
                {(bioClamped || bioOpen) && (
                  <button type="button" onClick={() => setBioOpen((v) => !v)} className="mt-3 text-xs leading-4 text-[#dbdee1] hover:underline">
                    {bioOpen ? 'Réduire la bio' : 'Afficher la bio complète'}
                  </button>
                )}
              </div>
            )}

            {memberSince && (
              <div className="mt-4 pb-4">
                <h4 className="text-xs font-semibold leading-4 text-white">Membre depuis</h4>
                <p className="mt-2 text-sm leading-[18px] text-[#dbdee1]">{memberSince}</p>
              </div>
            )}
          </div>
        </div>

        {covered && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
            <span className="relative">
              <UserAvatarImage src={profile.avatar_url} alt="" className="h-[52px] w-[52px]" fallbackClassName="text-xl" fallback={profile.display_name.charAt(0).toUpperCase()} ownerId={profile.id} />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-[var(--pcard)] bg-[#80848e] text-white">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><circle cx="12" cy="12" r="8" /><path d="M6 6l12 12" /></svg>
              </span>
            </span>
            <h3 className="mt-3 text-xl font-semibold leading-6 text-white">Afficher le profil ?</h3>
            <p className="mt-2 text-sm leading-[18px] text-white">Tu as bloqué <strong className="font-semibold">{profile.display_name}</strong>, donc on vérifie. Il ne sera pas averti et restera bloqué.</p>
            <button type="button" onClick={() => setRevealed(true)} className="mt-4 h-8 rounded-[4px] bg-[#5865f2] px-4 text-sm font-medium text-white transition-colors hover:bg-[#4752c4]">Oui, afficher le profil</button>
          </div>
        )}

        <div className={cn('shrink-0 p-4 pt-2', covered && 'pointer-events-none blur-[10px]')}>
          <button
            type="button"
            onClick={() => onViewFullProfile()}
            style={{ backgroundColor: theme?.surface ?? 'rgba(255,255,255,0.07)' }}
            className="h-[38px] w-full rounded-lg text-base font-medium text-white transition-[filter] hover:brightness-125"
          >
            Voir le profil complet
          </button>
        </div>
      </div>
    </div>
  );
}
