import { useState } from 'react';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { InlineBadgeStrip } from '@/components/badges/InlineBadgeStrip';
import { CustomStatusBubble } from './CustomStatusBubble';
import { CustomStatusModal } from './CustomStatusModal';
import { useClearCustomStatus } from '@/hooks/useClearCustomStatus';
import { cn } from '@/lib/utils';

/*
 * Tete commune de TOUTES les cartes de profil (carte du panneau utilisateur, carte d'un
 * membre, profil complet, editeur) : banniere, avatar a cheval avec pastille de presence,
 * bulle de statut, puis nom / pseudo • pronoms / badges. Seule la taille change :
 *  - "sm" : carte flottante de 360px (banniere 105px, avatar 80px) ;
 *  - "lg" : profil complet et editeur de 480px (banniere 168px, avatar 144px).
 */

export type ProfileCardSize = 'sm' | 'lg';

export interface ProfileCardUser {
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
  connections?: Array<{ provider: string; value: string }> | null;
}

const GEOM = {
  sm: {
    banner: 'h-[125px]',
    avatar: 'left-3 top-[67px]',
    avatarBorder: 'border-[8px]',
    avatarSize: 'w-[94px] h-[94px]',
    avatarText: 'text-4xl',
    status: 'w-7 h-7 border-[4px]',
    bubble: 'left-[128px] top-[118px] max-w-[218px]',
    body: 'pt-[72px] px-5',
    name: 'text-2xl leading-7',
    handle: 'text-base leading-[22px] mt-1',
  },
  lg: {
    banner: 'h-[168px]',
    avatar: 'left-7 top-[88px]',
    avatarBorder: 'border-[8px]',
    avatarSize: 'w-[144px] h-[144px]',
    avatarText: 'text-5xl',
    status: 'w-8 h-8 border-[6px]',
    bubble: 'left-[208px] top-[160px] max-w-[260px]',
    body: 'pt-[104px] px-7',
    name: 'text-2xl leading-[30px]',
    handle: 'text-base leading-[22px] mt-4',
  },
} as const;

interface Props {
  size: ProfileCardSize;
  user: ProfileCardUser;
  isOwn: boolean;
  /** Fond de la banniere sans image (couleur / degrade). */
  bannerStyle?: React.CSSProperties;
  bannerGuard?: React.HTMLAttributes<HTMLDivElement>;
  /** Bouton(s) poses en haut a droite de la banniere (menu "..."). */
  topRight?: React.ReactNode;
  /** Apercu non interactif (fenetre de statut) : la bulle est toujours affichee, avec son invite. */
  preview?: boolean;
  bubblePlaceholder?: string;
  /** Editeur : boutons flottants sur l'avatar / la banniere. */
  avatarSlot?: React.ReactNode;
  bannerSlot?: React.ReactNode;
  /** Remplace le nom / les pronoms par des champs modifiables en place. */
  nameSlot?: React.ReactNode;
  pronounsSlot?: React.ReactNode;
  /** Remplace la pastille du tag (menu de selection dans l'editeur). */
  tagSlot?: React.ReactNode;
  /** Contenu place sous l'identite (bio, actions, sections). */
  children?: React.ReactNode;
  className?: string;
}

export function ProfileCardHeader({
  size,
  user,
  isOwn,
  bannerStyle,
  bannerGuard,
  topRight,
  preview,
  bubblePlaceholder,
  avatarSlot,
  bannerSlot,
  nameSlot,
  pronounsSlot,
  tagSlot,
  children,
  className,
}: Props) {
  const g = GEOM[size];
  const [statusOpen, setStatusOpen] = useState(false);
  const clearCustomStatus = useClearCustomStatus();
  const showStatus = preview || (user.status !== 'offline' && (!!user.custom_status || isOwn));

  return (
    <div className={cn('relative', className)}>
      <div className={cn('relative shrink-0 group/banner overflow-hidden', size === 'sm' && 'rounded-t-lg', g.banner)} style={user.banner_url ? undefined : bannerStyle} {...bannerGuard}>
        {user.banner_url && <img src={user.banner_url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />}
        {bannerSlot}
      </div>
      {topRight && <div className="absolute top-2.5 right-2.5 z-20">{topRight}</div>}

      <div className={cn('absolute z-10 group/avatar', g.avatar)}>
        <div className={cn('relative rounded-full bg-[#383840] border-[#383840]', g.avatarBorder)}>
          <UserAvatarImage
            src={user.avatar_url}
            alt={user.display_name}
            className={g.avatarSize}
            fallbackClassName={cn('bg-primary/20 text-primary font-semibold', g.avatarText)}
            fallback={(user.display_name || '?').charAt(0).toUpperCase()}
            ownerId={user.id}
          />
          {avatarSlot}
          <StatusIndicator
            status={user.status || 'offline'}
            className={cn('absolute border-[#383840]', 'bottom-0 right-0', g.status)}
            bgClassName="bg-[#383840]"
          />
        </div>
      </div>

      {showStatus && (
        <div className={cn('absolute z-20', g.bubble)}>
          <CustomStatusBubble
            customStatus={user.custom_status}
            status={user.status}
            size={size === 'sm' ? 'sm' : 'md'}
            showPlaceholder={isOwn || preview}
            placeholder={bubblePlaceholder}
            onClick={isOwn && !preview ? () => setStatusOpen(true) : undefined}
            onClear={isOwn && !preview ? clearCustomStatus : undefined}
          />
        </div>
      )}

      <div className={cn('min-w-0', g.body)}>
        {nameSlot ?? <h2 translate="no" className={cn('font-bold text-white truncate', g.name)}>{user.display_name}</h2>}
        <div className={cn('flex items-center gap-2 min-w-0 text-[#dbdee1]', g.handle)}>
          <span translate="no" className="truncate">{user.username}</span>
          {pronounsSlot ?? (user.pronouns ? <><span aria-hidden>•</span><span className="truncate">{user.pronouns}</span></> : null)}
          {tagSlot ?? <ServerTagBadge userId={user.id} variant="profile" />}
        </div>
        <InlineBadgeStrip userId={user.id} max={4} className="mt-2 w-fit max-w-full rounded-md bg-white/[0.06] px-1.5 py-0.5" />
        {children}
      </div>

      {isOwn && !preview && <CustomStatusModal open={statusOpen} onOpenChange={setStatusOpen} />}
    </div>
  );
}
