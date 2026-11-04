import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { appLocale } from '@/i18n/locale';
import { useServerForTag, useUserServerTag, type UserTag } from '@/hooks/useServerTags';
import { useServers, useJoinServer } from '@/hooks/useServers';
import { OPEN_SERVER_EVENT } from '@/lib/invites';
import { badgeById, badgeUrl, tagIconColor } from '@/lib/serverTags';
import { cn } from '@/lib/utils';

/*
 * Pastille du tag de serveur (reference : tag Discord) : badge pixel art net + texte du tag, sur un fond arrondi
 * discret teinte par la couleur du tag. Au clic, ouvre la fiche du serveur (nom, icone, description, "Voir le
 * serveur" / "Rejoindre" selon l'acces). Deux variantes : standard (messages, profils) et compacte (listes).
 */

type TagLike = Pick<UserTag, 'serverId' | 'name' | 'badgeId' | 'color'>;

/*
 * Icone pixel art du tag. Sans couleur : sprite d'origine. Avec une couleur : le sprite est passe en niveaux de gris
 * puis multiplie par la couleur (le trait sombre reste sombre, les ombres suivent), le tout decoupe sur la forme du sprite.
 */
export function TagBadgeIcon({ id, color, className }: { id: string; color?: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  const known = badgeById(id);
  const tint = tagIconColor(color);
  if (broken || !known) {
    // Image indisponible : on garde la pastille lisible avec une puce neutre.
    return <span aria-hidden className={cn('inline-block rounded-[2px] bg-white/30', className)} />;
  }
  const url = badgeUrl(id);
  if (!tint) {
    return <img src={url} alt="" aria-hidden draggable={false} onError={() => setBroken(true)} className={cn('shrink-0 select-none', className)} style={{ imageRendering: 'pixelated' }} />;
  }
  return (
    <span
      aria-hidden
      className={cn('relative inline-block shrink-0 select-none', className)}
      style={{
        backgroundColor: tint,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        isolation: 'isolate',
        imageRendering: 'pixelated',
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'grayscale(1) brightness(1.5) contrast(1.05)', mixBlendMode: 'multiply', imageRendering: 'pixelated' }}
      />
    </span>
  );
}

/*
 * Mise en page relevee sur la reference (1 px = 1 px) :
 *  - "standard" (messages, listes de membres) : pastille grise de 18 px, icone 16 px, texte blanc gras 12 px ;
 *  - "profile" (cartes et editeur de profil) : pastille de 26 px avec filet sombre, icone 18 px, texte 14 px.
 * La couleur du tag ne touche que l'icone.
 */
export function ServerTagPill({ tag, variant = 'standard', className }: { tag: TagLike; variant?: 'standard' | 'compact' | 'profile'; className?: string }) {
  const profile = variant === 'profile';
  return (
    <span
      className={cn(
        'inline-flex items-center shrink-0 align-middle font-bold leading-none select-none bg-white/[0.10] text-white',
        profile ? 'h-[26px] gap-1 pl-[6px] pr-[8px] text-sm rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.28)]' : 'h-[18px] gap-[3px] pl-[5px] pr-[7px] text-xs rounded-[4px]',
        className,
      )}
    >
      <TagBadgeIcon id={tag.badgeId} color={tag.color} className={profile ? 'w-[18px] h-[18px]' : 'w-4 h-4'} />
      <span translate="no" className="truncate max-w-[5ch]">{tag.name}</span>
    </span>
  );
}

function ServerTagCard({ tag, onClose }: { tag: TagLike; onClose: () => void }) {
  const { data: server, isLoading } = useServerForTag(tag.serverId);
  const { data: myServers = [] } = useServers();
  const join = useJoinServer();
  const isMember = myServers.some((s) => s.id === tag.serverId);
  const open = () => {
    window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId: tag.serverId } }));
    onClose();
  };
  const since = server?.created_at ? new Date(server.created_at).toLocaleDateString(appLocale(), { month: 'short', year: 'numeric' }) : null;

  /* Fiche du serveur (video de reference) : banniere, icone ronde a cheval, nom + tag, membres, anciennete,
     description, puis bouton vert. */
  return (
    <div className="relative">
      <div className="h-[145px] rounded-t-lg overflow-hidden bg-primary">
        {server?.banner_url && <img src={server.banner_url} alt="" draggable={false} className="w-full h-full object-cover" />}
      </div>
      <div className="absolute left-4 top-[105px]">
        {server?.icon_url ? (
          <img src={server.icon_url} alt="" className="w-20 h-20 rounded-full object-cover border-[6px] border-[#383840] bg-[#383840]" />
        ) : (
          <span className="w-20 h-20 rounded-full bg-[#4a4a85] border-[6px] border-[#383840] flex items-center justify-center text-2xl font-bold text-white">
            {(server?.name ?? tag.name).slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="px-4 pt-[52px] pb-4">
        <div className="flex items-center gap-2 min-w-0">
          <p translate="no" className="text-xl leading-6 font-bold text-white truncate">{server?.name ?? (isLoading ? '…' : 'Serveur')}</p>
          <ServerTagPill tag={tag} variant="compact" />
        </div>
        {server?.memberCount != null && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#dbdee1]">
            <span className="w-2 h-2 rounded-full bg-[#80848e]" aria-hidden />
            {server.memberCount.toLocaleString('fr-FR')} membre{server.memberCount > 1 ? 's' : ''}
          </p>
        )}
        {since && <p className="text-sm text-[#b5bac1]">depuis {since}</p>}
        {server?.description && <p className="mt-3 text-base leading-[22px] text-[#b5bac1] break-words line-clamp-4">{server.description}</p>}
        <div className="mt-4">
          {isMember ? (
            <button type="button" onClick={open} className="w-full h-10 rounded-[4px] bg-[#248046] hover:bg-[#1a6334] text-base font-medium text-white transition-colors">Aller sur le serveur</button>
          ) : server?.is_public ? (
            <button type="button" disabled={join.isPending} onClick={() => join.mutate(tag.serverId, { onSuccess: open })} className="w-full h-10 rounded-[4px] bg-[#248046] hover:bg-[#1a6334] disabled:opacity-60 text-base font-medium text-white transition-colors">Rejoindre</button>
          ) : (
            <p className="text-xs text-muted-foreground text-center">Ce serveur est privé : il faut une invitation pour le rejoindre.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** Affiche le tag actif de cet utilisateur (charge automatiquement). */
  userId?: string | null;
  /** Ou un tag deja connu. */
  tag?: TagLike | null;
  variant?: 'standard' | 'compact' | 'profile';
  interactive?: boolean;
  className?: string;
}

export function ServerTagBadge({ userId, tag: given, variant = 'standard', interactive = true, className }: Props) {
  const { data: loaded } = useUserServerTag(given ? null : userId);
  const tag = given ?? loaded;
  const [open, setOpen] = useState(false);
  if (!tag) return null;
  if (!interactive) return <ServerTagPill tag={tag} variant={variant} className={className} />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Tag du serveur ${tag.name}`}
          onClick={(e) => e.stopPropagation()}
          className={cn('shrink-0 rounded-[5px] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-[filter] cursor-pointer', className)}
        >
          <ServerTagPill tag={tag} variant={variant} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={8} collisionPadding={12} className="z-[140] w-[360px] p-0 rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <ServerTagCard tag={tag} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
