import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useServers } from '@/hooks/useServers';
import { useJoinByInvite } from '@/hooks/useInvites';
import { ServerBadgeIcon } from '@/components/icons/ServerBadgeIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchInvitePreview, OPEN_SERVER_EVENT, type InvitePreview, type InviteRef } from '@/lib/invites';
import { cn } from '@/lib/utils';

import { appLocale } from '@/i18n/locale';
/*
 * Carte d'invitation de serveur, reproduite de Discord (2025) :
 *  - 360px, fond #393a41, bord 1px, coins 16px ;
 *  - banniere 88px, icone 80px en squircle qui deborde de 40px, entouree
 *    d'un anneau de la couleur de la carte ;
 *  - nom 18px gras + badge de boost + tag de serveur ; "● N en ligne ● N
 *    membres" ; "depuis <mois annee>" ; description limitee a 3 lignes ;
 *  - au survol, la carte s'agrandit : description complete, jeu, traits ;
 *  - bouton vert pleine largeur ("Rejoindre" / "Aller sur le serveur").
 * Pendant le chargement : "Résolution de l'invitation" + squelette.
 */

const nf = new Intl.NumberFormat(appLocale());
const fmtCount = (n: number) => nf.format(n).replace(/\u202f/g, ' ');
const fmtSince = (d: Date) =>
  `depuis ${d.toLocaleDateString(appLocale(), { month: 'short', year: 'numeric' })}`;

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-full max-w-[360px] rounded-2xl border border-[hsl(var(--invite-border))] bg-[hsl(var(--invite-card))] overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

function InviteSkeleton() {
  return (
    <div className="w-full max-w-[520px] rounded-lg border border-[hsl(var(--invite-border))] bg-[hsl(var(--invite-card))] p-4">
      <div className="text-base font-semibold text-[hsl(var(--muted-foreground))] mb-3">Résolution de l'invitation</div>
      <div className="flex items-center gap-3">
        <div className="w-[60px] h-[60px] rounded-2xl bg-white/[0.07] animate-pulse shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-5 w-2/5 rounded bg-white/[0.07] animate-pulse" />
          <div className="h-4 w-3/5 rounded bg-white/[0.05] animate-pulse" />
        </div>
        <div className="w-20 h-11 rounded bg-white/[0.1] animate-pulse shrink-0" />
      </div>
    </div>
  );
}

function InvalidInvite() {
  return (
    <div className="w-full max-w-[432px] rounded-lg border border-[hsl(var(--invite-border))] bg-[hsl(var(--invite-card))] p-4">
      <div className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] mb-3">Tu as reçu une invitation, mais…</div>
      <div className="flex items-center gap-4">
        <div className="w-[50px] h-[50px] rounded-2xl bg-[hsl(var(--surface-3))] flex items-center justify-center text-2xl text-[hsl(var(--muted-foreground))] shrink-0">
          ?
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-[hsl(var(--destructive))]">Invitation invalide</div>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Essaie d'envoyer une nouvelle invitation !</div>
        </div>
      </div>
    </div>
  );
}

/** Badge de boost (rose), affiche pour les serveurs Discord boostes. */
function BoostBadge({ tier }: { tier: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-[18px] h-[18px] shrink-0 items-center justify-center rounded-full bg-[#ff73fa]/20">
          <svg viewBox="0 0 8 12" className="w-2 h-3 text-[#ff73fa]" fill="currentColor" aria-hidden="true">
            <path d="M4 0 0 4v4l4 4 4-4V4L4 0Zm2 7.2L4 9.2 2 7.2V4.8l2-2 2 2v2.4Z" />
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent><p>Serveur boosté (niveau {tier})</p></TooltipContent>
    </Tooltip>
  );
}

function ServerIcon({ invite }: { invite: InvitePreview }) {
  const [failed, setFailed] = useState(false);
  const initials = invite.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3);
  return (
    <div className="w-20 h-20 rounded-[24px] ring-4 ring-[hsl(var(--invite-card))] bg-[hsl(var(--invite-card))] overflow-hidden shrink-0">
      {invite.iconUrl && !failed ? (
        <img src={invite.iconUrl} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[hsl(var(--primary))] text-white text-2xl font-semibold">
          {initials}
        </div>
      )}
    </div>
  );
}

function InviteCard({ invite }: { invite: InvitePreview }) {
  const { user } = useAuth();
  const { data: servers } = useServers();
  const join = useJoinByInvite();
  const [bannerFailed, setBannerFailed] = useState(false);
  const isMember = invite.source === 'app' && !!servers?.some((s) => s.id === invite.serverId);
  const hasExtras = !!invite.game || invite.traits.length > 0;

  const openServer = () => window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId: invite.serverId } }));

  const onClick = () => {
    if (invite.source === 'discord') {
      window.open(`https://discord.gg/${invite.code}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (isMember) return openServer();
    join.mutate(invite.code, { onSuccess: openServer });
  };

  const label =
    invite.source === 'discord'
      ? 'Rejoindre sur Discord'
      : isMember
        ? 'Aller sur le serveur'
        : invite.unusable
          ? 'Invitation expirée'
          : 'Rejoindre';

  return (
    <CardShell className="group/invite">
      <div className="h-[88px] bg-[hsl(var(--surface-3))]">
        {invite.bannerUrl && !bannerFailed && (
          <img src={invite.bannerUrl} alt="" className="w-full h-full object-cover" onError={() => setBannerFailed(true)} />
        )}
      </div>
      <div className="px-5 pb-5">
        <div className="-mt-10 mb-3">
          <ServerIcon invite={invite} />
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          {invite.community && invite.source === 'app' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0"><ServerBadgeIcon className="w-[18px] h-[18px]" /></span>
              </TooltipTrigger>
              <TooltipContent><p>Communauté</p></TooltipContent>
            </Tooltip>
          )}
          <span translate="no" className="text-lg font-bold leading-6 text-[hsl(var(--foreground))] truncate">{invite.name}</span>
          {invite.boostTier > 0 && <BoostBadge tier={invite.boostTier} />}
          {invite.tag && (
            <span className="inline-flex items-center gap-1 h-[18px] px-1 rounded bg-[hsl(var(--invite-pill))] text-xs font-bold text-[hsl(var(--foreground))] shrink-0">
              {invite.tag.badgeUrl && <img src={invite.tag.badgeUrl} alt="" className="w-3.5 h-3.5" />}
              {invite.tag.label}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm leading-[18px] text-[hsl(var(--invite-text))]">
          {invite.onlineCount != null && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--online))]" />
              {fmtCount(invite.onlineCount)} en ligne
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))]" />
            {fmtCount(invite.memberCount)} {invite.memberCount > 1 ? 'membres' : 'membre'}
          </span>
        </div>
        {invite.createdAt && (
          <div className="text-sm leading-[18px] text-[hsl(var(--invite-text))] mt-0.5">{fmtSince(invite.createdAt)}</div>
        )}

        {invite.description && (
          <p className="mt-3 text-sm leading-[18px] text-[hsl(var(--muted-foreground))] break-words line-clamp-3 group-hover/invite:line-clamp-none">
            {invite.description}
          </p>
        )}

        {/* Partie revelee au survol (grid 0fr -> 1fr pour animer la hauteur). */}
        {hasExtras && (
          <div className="grid grid-rows-[0fr] group-hover/invite:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out">
            <div className="overflow-hidden">
              {invite.game && (
                <div className="flex items-center gap-2 pt-4">
                  {invite.game.iconUrl && <img src={invite.game.iconUrl} alt="" className="w-8 h-8 rounded-md" />}
                  <span translate="no" className="text-sm font-semibold text-[hsl(var(--foreground))]">{invite.game.name}</span>
                </div>
              )}
              {invite.traits.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4">
                  {invite.traits.map((t) => (
                    <span
                      key={t.label}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[hsl(var(--invite-border))] text-sm text-[hsl(var(--invite-text))]"
                    >
                      {t.emojiUrl ? <img src={t.emojiUrl} alt="" className="w-4 h-4" /> : t.emoji ? <span className="text-sm leading-none">{t.emoji}</span> : null}
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClick}
          disabled={!user || join.isPending || (invite.source === 'app' && !isMember && invite.unusable)}
          className="mt-4 w-full h-9 rounded-lg bg-[hsl(var(--invite-join))] hover:bg-[hsl(var(--invite-join-hover))] text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {join.isPending ? 'Connexion…' : label}
        </button>
      </div>
    </CardShell>
  );
}

export function InviteEmbed({ invite }: { invite: InviteRef }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['invite-preview', invite.source, invite.code.toLowerCase()],
    queryFn: () => fetchInvitePreview(invite),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  if (isLoading) return <InviteSkeleton />;
  if (isError || !data) return <InvalidInvite />;
  return <InviteCard invite={data} />;
}
