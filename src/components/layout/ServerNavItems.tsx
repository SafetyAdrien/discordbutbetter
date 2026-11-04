import { Gem, Users } from '@/components/icons/discord/lucide';
import { ChannelSheetIcon } from '@/components/icons/ChannelSheetIcon';

// Icones de la planche des types de salon pour les raccourcis.
const GuideIcon = ({ className }: { className?: string }) => <ChannelSheetIcon name="guide" className={className} />;
const EventsIcon = ({ className }: { className?: string }) => <ChannelSheetIcon name="calendar" className={className} />;
const BrowseIcon = ({ className }: { className?: string }) => <ChannelSheetIcon name="browseChannels" className={className} />;
import type { ServerView } from '@/components/server-views/ServerViews';
import { cn } from '@/lib/utils';

/*
 * Raccourcis en haut de la liste des salons, comme Discord : "Guide du
 * serveur", "N evenement(s)", "Chercher des salons", "Membres", "Boosts de
 * serveur". Le guide, la recherche de salons et les membres n'apparaissent
 * que pour un serveur de communaute ; "Membres" demande aussi l'acces aux
 * parametres (la page propose d'expulser ou de bannir).
 */
interface Item {
  id: ServerView | 'events';
  label: string;
  icon: React.ElementType;
}

export function ServerNavItems({
  community,
  eventCount,
  canSeeMembers,
  activeView,
  onOpenView,
  onOpenEvents,
}: {
  community: boolean;
  eventCount: number;
  canSeeMembers: boolean;
  activeView?: ServerView | null;
  onOpenView?: (view: ServerView) => void;
  onOpenEvents: () => void;
}) {
  const items: Item[] = [
    ...(community ? [{ id: 'guide' as const, label: 'Guide du serveur', icon: GuideIcon }] : []),
    { id: 'events', label: eventCount ? `${eventCount} événement${eventCount > 1 ? 's' : ''}` : 'Événements', icon: EventsIcon },
    ...(community ? [{ id: 'browse' as const, label: 'Chercher des salons', icon: BrowseIcon }] : []),
    ...(community && canSeeMembers ? [{ id: 'members' as const, label: 'Membres', icon: Users }] : []),
    { id: 'boosts', label: 'Boosts de serveur', icon: Gem },
  ];

  return (
    <div className="pt-3 pb-1 space-y-0.5">
      {items.map(({ id, label, icon: Icon }) => {
        const active = id !== 'events' && activeView === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => (id === 'events' ? onOpenEvents() : onOpenView?.(id))}
            className={cn('channel-item group mx-2 w-[calc(100%-16px)]', active && 'active')}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span
              className={cn(
                'truncate flex-1 text-left font-ginto text-[16px] font-medium',
                active ? 'text-white' : 'text-[hsl(var(--interactive-text-default))] group-hover:text-[hsl(var(--interactive-text-hover))]',
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
      <div className="mx-4 pt-3 border-b border-[hsl(var(--frame-border))]" />
    </div>
  );
}
