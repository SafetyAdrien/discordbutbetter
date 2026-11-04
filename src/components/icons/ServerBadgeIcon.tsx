import { BADGE_ICONS } from '@/lib/badgeIcons';
import { cn } from '@/lib/utils';

/*
 * Rosette devant le nom d'un serveur de communaute (planche de badges
 * Discord) : maison pour une communaute, globe quand tout le monde peut la
 * rejoindre. Les variantes roses (serveur booste), partenaire et verifie
 * existent dans src/assets/badges mais l'app n'a pas encore ces statuts.
 */
export function ServerBadgeIcon({ discoverable = false, className }: { discoverable?: boolean; className?: string }) {
  return (
    <img
      src={BADGE_ICONS[discoverable ? 'server_discoverable' : 'server_community']}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('shrink-0 select-none', className)}
    />
  );
}
