import { useEffect, useRef, useState } from 'react';
import { VoiceActivityCard } from '@/components/profile/VoiceActivityCard';
import { ProfileCalendar } from '@/components/profile/calendar/ProfileCalendar';
import { EventListBelow } from '@/components/profile/calendar/EventListBelow';
import { cn } from '@/lib/utils';

/*
 * Volet de droite d'un profil (video de reference) : onglets soulignes
 * "Tableau" (widgets), "Calendrier" (le calendrier du profil, conserve), "Activité"
 * et "Liste de souhaits". Les widgets et la liste de souhaits n'ont pas encore de
 * backend : leurs onglets affichent un etat vide "Bientôt disponible".
 */

export type ProfileTab = string;

const BASE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'board', label: 'Tableau' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'activity', label: 'Activité' },
  { id: 'wishlist', label: 'Liste de souhaits' },
];

const ACTIVITY_LABELS: Record<string, string> = {
  playing: 'Joue à',
  streaming: 'Diffuse',
  listening: 'Écoute',
  watching: 'Regarde',
  competing: 'En compétition sur',
};

function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-6">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {children && <p className="mt-2 max-w-[320px] text-sm leading-[18px] text-muted-foreground">{children}</p>}
    </div>
  );
}

interface Props {
  userId?: string;
  /** Pour la carte "Dans un salon vocal". */
  voiceUser?: { id: string; display_name: string; avatar_url: string | null };
  isOwn: boolean;
  activity?: { type?: string | null; text?: string | null };
  /** Contenu supplementaire de l'onglet Activite (formulaire dans l'editeur). */
  activityEditor?: React.ReactNode;
  /** Onglets supplementaires (serveurs / amis en commun sur le profil d'un autre utilisateur). */
  extraTabs?: { id: string; label: string; content: React.ReactNode }[];
  /** Onglet ouvert au depart. */
  initialTab?: ProfileTab;
  /** Etat vide personnalise de l'onglet Activite (profil d'un autre utilisateur). */
  activityEmpty?: React.ReactNode;
  /** Sans filet sous les onglets (fenetre de profil complet) : la barre de defilement des onglets fait office de filet. */
  bare?: boolean;
  className?: string;
}

export function ProfileTabsPane({ userId, voiceUser, isOwn, activity, activityEditor, extraTabs = [], initialTab = 'board', activityEmpty, bare, className }: Props) {
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setTab(initialTab), [initialTab]);
  // L'onglet actif reste visible quand la liste deborde (onglets "N amis / serveurs en commun").
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [tab]);
  const TABS = [...BASE_TABS, ...extraTabs.map(({ id, label }) => ({ id, label }))];

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Sections du profil"
        className={cn(
          'shrink-0 flex gap-6',
          bare ? 'overflow-x-auto [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3a414d] [&::-webkit-scrollbar-track]:bg-transparent pb-[6px]' : 'border-b border-white/[0.08]',
        )}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative h-[34px] shrink-0 whitespace-nowrap text-base font-medium transition-colors',
              !bare && '-mb-px',
              tab === t.id ? 'text-white' : 'text-[#b5bac1] hover:text-white',
            )}
          >
            {t.label}
            <span
              className={cn(
                'absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-white origin-left transition-transform duration-150',
                tab === t.id ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </button>
        ))}
      </div>

      <div role="tabpanel" className={cn('flex-1 min-h-0 overflow-y-auto scrollbar-thin animate-in fade-in-0 duration-150', bare ? 'pt-2' : 'pt-4')} key={tab}>
        {tab === 'board' && userId && voiceUser && <VoiceActivityCard user={voiceUser} className="mb-4 max-w-[420px]" />}
        {tab === 'board' && (
          <Empty title={isOwn ? 'Personnalise ton profil avec des widgets' : 'Aucun widget'}>
            {isOwn
              ? "Les widgets te permettront de présenter tes jeux et centres d'intérêt. Bientôt disponible."
              : "Cette personne n'a pas encore ajouté de widget."}
          </Empty>
        )}

        {tab === 'calendar' && (
          <div className="space-y-4 pb-6">
            <ProfileCalendar userId={isOwn ? undefined : userId} readOnly={!isOwn} />
            <EventListBelow userId={isOwn ? undefined : userId} readOnly={!isOwn} />
          </div>
        )}

        {tab === 'activity' && (
          <div className={cn('space-y-4 pb-6', !activityEditor && !(activity?.type && activity.text) && activityEmpty && 'h-full pb-0')}>
            {activityEditor}
            {activity?.type && activity.text ? (
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{ACTIVITY_LABELS[activity.type] ?? 'Activité'}</p>
                <p className="mt-1 text-base font-semibold text-white break-words">{activity.text}</p>
              </div>
            ) : (
              !activityEditor && (activityEmpty ?? <Empty title="Aucune activité">Rien à afficher pour le moment.</Empty>)
            )}
          </div>
        )}

        {tab === 'wishlist' && <Empty title="Liste de souhaits">Bientôt disponible.</Empty>}

        {extraTabs.find((t) => t.id === tab)?.content}
      </div>
    </div>
  );
}
