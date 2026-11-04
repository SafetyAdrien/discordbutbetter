import { useState } from 'react';
import { ArrowRight, Info } from '@/components/icons/discord/lucide';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { ServerPreviewCard } from '@/components/server-views/ServerPreviewCard';
import { useFollowedChannelInfo } from '@/hooks/useChannelFollowers';
import { OPEN_SERVER_EVENT } from '@/lib/invites';
import { publishedAuthorName, type PublishedSource } from '@/lib/announcements';

/*
 * Salons d'annonces, d'apres la video de reference :
 *  - auteur d'un message publie : icone du serveur source, nom de l'annonce,
 *    badge SERVEUR, et au clic la carte du serveur ("Aller sur le serveur") ;
 *  - "Partage ca avec tes abonnes ! Publier (i) · Ne plus afficher" sous un
 *    message non publie, et la confirmation "Veux-tu vraiment continuer ?" ;
 *  - message systeme "X a ajoute <serveur> #<salon> dans ce salon".
 */


function ServerAvatar({ name, icon, size = 40 }: { name: string; icon?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  return icon && !failed ? (
    <img src={icon} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} onError={() => setFailed(true)} />
  ) : (
    <span className="rounded-full bg-primary text-white font-semibold flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Carte du serveur source (clic sur l'auteur ou l'avatar d'un message publie). */
function SourceServerCard({ src, sourceChannelId }: { src: PublishedSource; sourceChannelId?: string | null }) {
  const { data: info } = useFollowedChannelInfo(sourceChannelId ?? null);
  const serverId = info?.server_id ?? src.serverId ?? null;
  return (
    <div className="w-[300px]">
      <ServerPreviewCard
        className="rounded-xl"
        name={info?.server_name ?? src.serverName}
        iconUrl={info?.server_icon_url ?? src.serverIcon}
        bannerUrl={info?.server_banner_url}
        onlineCount={Number(info?.online_count ?? 0)}
        memberCount={Number(info?.member_count ?? 0)}
        createdAt={info?.server_created_at}
      />
      <div className="px-4 pb-4 -mt-1 bg-[hsl(var(--surface-card))] rounded-b-xl">
        {info?.server_description && <p className="pb-3 text-sm text-foreground">{info.server_description}</p>}
        {info?.is_member && serverId ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId } }))}
            className="w-full h-9 rounded-lg bg-[hsl(var(--invite-join))] hover:bg-[hsl(var(--invite-join-hover))] text-sm font-medium text-white"
          >
            Aller sur le serveur
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">Rejoins ce serveur avec une invitation pour participer.</p>
        )}
      </div>
    </div>
  );
}

export function PublishedAvatar({ src }: { src: PublishedSource }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="shrink-0 rounded-full" aria-label={publishedAuthorName(src)}>
          <ServerAvatar name={src.serverName} icon={src.serverIcon} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-auto p-0 border-0 bg-transparent shadow-2xl">
        <SourceServerCard src={src} sourceChannelId={src.sourceChannelId} />
      </PopoverContent>
    </Popover>
  );
}

export function PublishedAuthorName({ src }: { src: PublishedSource }) {
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="font-semibold text-[15px] leading-[1.375rem] text-foreground hover:underline truncate max-w-[260px]">
            {publishedAuthorName(src)}
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-auto p-0 border-0 bg-transparent shadow-2xl">
          <SourceServerCard src={src} sourceChannelId={src.sourceChannelId} />
        </PopoverContent>
      </Popover>
      <span className="inline-flex items-center h-[15px] px-1 rounded bg-primary text-[10px] font-semibold leading-none text-white uppercase shrink-0">
        Serveur
      </span>
    </span>
  );
}

/** "Partage ca avec tes abonnes ! Publier (i) · Ne plus afficher" */
export function PublishPrompt({ onPublish, onDismiss, disabled }: { onPublish: () => void; onDismiss: () => void; disabled?: boolean }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
      <StreamlineMegaphone className="w-4 h-4 shrink-0" />
      <span className="font-medium text-foreground">Partage ça avec tes abonnés !</span>
      <button type="button" disabled={disabled} onClick={onPublish} className="text-[hsl(var(--text-link))] hover:underline disabled:opacity-50">
        Publier
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex"><Info className="w-4 h-4" /></span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px]">
          <p>Les serveurs qui suivent ce salon recevront ce message. Tu pourras toujours le modifier ou le supprimer ensuite.</p>
        </TooltipContent>
      </Tooltip>
      <span className="mx-1">·</span>
      <button type="button" onClick={onDismiss} className="hover:underline hover:text-foreground">
        Ne plus afficher
      </button>
    </div>
  );
}

export function PublishConfirmDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6 gap-0">
        <DialogTitle className="text-xl font-semibold text-white pr-8">Veux-tu vraiment continuer ?</DialogTitle>
        <DialogDescription className="mt-4 text-base text-foreground">
          Ce message va être envoyé à tous les serveurs qui suivent ce salon. Tu pourras toujours modifier ou supprimer ce message plus tard, et il sera mis à jour sur tous les serveurs abonnés.
        </DialogDescription>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-10" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="h-10"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Confirmer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Bouton "Publier" de la barre d'actions au survol d'un message. */
export function PublishActionButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={onClick} aria-label="Publier" className="w-8 h-8 flex items-center justify-center rounded text-[hsl(var(--icon-default))] hover:text-white hover:bg-[hsl(var(--interactive-background-hover))]">
          <StreamlineMegaphone className="w-5 h-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent><p>Publier</p></TooltipContent>
    </Tooltip>
  );
}


export function ChannelFollowedSystemMessage({ sourceChannelId, actorName, onActorClick, timeLabel }: { sourceChannelId: string; actorName: string; onActorClick?: () => void; timeLabel: string }) {
  const { data: info } = useFollowedChannelInfo(sourceChannelId);
  return (
    <div className="-mx-4 flex items-start gap-4 px-4 py-1 message-hover">
      <span className="w-10 shrink-0 flex justify-center pt-0.5"><ArrowRight className="w-5 h-5 text-[hsl(var(--online))]" /></span>
      <p className="text-base text-muted-foreground">
        <button type="button" onClick={onActorClick} className="font-semibold text-foreground hover:underline">{actorName}</button>
        {' '}a ajouté{' '}
        <span className="font-semibold text-foreground">{info ? `${info.server_name} #${info.channel_name}` : 'un salon d\'annonces'}</span>
        {' '}dans ce salon. Les mises à jour les plus importantes s'afficheront ici.
        <span className="ml-2 text-xs">{timeLabel}</span>
      </p>
    </div>
  );
}
