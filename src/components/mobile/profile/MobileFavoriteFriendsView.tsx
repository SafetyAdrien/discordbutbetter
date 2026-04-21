import { useMemo } from 'react';
import { useFrequentDMContacts, type FrequentContact } from '@/hooks/useFrequentDMContacts';
import { useFavoriteFriendIds } from '@/hooks/useFavoriteFriends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageCircle, Users } from 'lucide-react';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface Props {
  onBack: () => void;
  onOpenDM: (conversationId: string) => void;
}

const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

export function MobileFavoriteFriendsView({ onBack, onOpenDM }: Props) {
  const { data: contacts = [], isLoading } = useFrequentDMContacts();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();

  // Bucket by recency window
  const { dayContacts, weekContacts, monthContacts } = useMemo(() => {
    const day: FrequentContact[] = [];
    const week: FrequentContact[] = [];
    const month: FrequentContact[] = [];
    contacts.forEach((c) => {
      if (c.countDay > 0) day.push(c);
      else if (c.countWeek > 0) week.push(c);
      else if (c.countMonth > 0) month.push(c);
    });
    return { dayContacts: day, weekContacts: week, monthContacts: month };
  }, [contacts]);

  const handleOpen = (conversationId: string) => {
    haptics.light();
    onOpenDM(conversationId);
  };

  return (
    <MobileProfileSubpage title="Amis fréquents" onBack={onBack}>
      {isLoading && (
        <div className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      )}

      {!isLoading && contacts.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-2">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            Aucun ami fréquent pour le moment
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Tes contacts les plus actifs apparaîtront ici automatiquement.
          </p>
        </div>
      )}

      {dayContacts.length > 0 && (
        <>
          <SectionHeader>Aujourd'hui ({dayContacts.length})</SectionHeader>
          <ContactList
            contacts={dayContacts}
            favoriteIds={favoriteIds}
            metric="day"
            onOpen={handleOpen}
          />
        </>
      )}

      {weekContacts.length > 0 && (
        <>
          <SectionHeader>Cette semaine ({weekContacts.length})</SectionHeader>
          <ContactList
            contacts={weekContacts}
            favoriteIds={favoriteIds}
            metric="week"
            onOpen={handleOpen}
          />
        </>
      )}

      {monthContacts.length > 0 && (
        <>
          <SectionHeader>Ce mois-ci ({monthContacts.length})</SectionHeader>
          <ContactList
            contacts={monthContacts}
            favoriteIds={favoriteIds}
            metric="month"
            onOpen={handleOpen}
          />
        </>
      )}
    </MobileProfileSubpage>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function ContactList({
  contacts,
  favoriteIds,
  metric,
  onOpen,
}: {
  contacts: FrequentContact[];
  favoriteIds: string[];
  metric: 'day' | 'week' | 'month';
  onOpen: (conversationId: string) => void;
}) {
  return (
    <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
      {contacts.map((c, idx) => {
        const isFav = favoriteIds.includes(c.userId);
        const count =
          metric === 'day' ? c.countDay : metric === 'week' ? c.countWeek : c.countMonth;
        return (
          <div key={c.userId}>
            {idx > 0 && <div className="h-px bg-border/40 mx-4" />}
            <button
              onClick={() => onOpen(c.conversationId)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors text-left"
            >
              <div className="relative shrink-0">
                <Avatar className="w-11 h-11">
                  <AvatarImage src={c.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {(c.displayName || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card',
                    statusColors[c.status || 'offline']
                  )}
                />
                {isFav && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-card flex items-center justify-center">
                    <Star className="w-2.5 h-2.5 fill-[hsl(var(--idle))] text-[hsl(var(--idle))]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {count} message{count > 1 ? 's' : ''} · @{c.username}
                </p>
              </div>
              <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
