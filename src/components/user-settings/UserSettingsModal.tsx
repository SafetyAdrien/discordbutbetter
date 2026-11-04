import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, LogOut, Pencil, Search, X } from '@/components/icons/discord/lucide';
import { useAuth } from '@/contexts/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useSettingsScrollSpy, scrollToSettingsSection } from '@/hooks/useSettingsScrollSpy';
import { ProfileSettingsTab } from '@/components/account-settings/ProfileSettingsTab';
import { AccountSettingsContext } from '@/components/account-settings/AccountSettingsContext';
import { cn } from '@/lib/utils';
import { ALL_NAV_PAGES, USER_SETTINGS_NAV, resolveSettingsPage, type UserSettingsPage } from './userSettingsNav';
import { UserSettingsNavContext } from './UserSettingsNavContext';
import { AccountPage, MessagingPage, NotificationsPage, PrivacyPage } from './pages/AccountPages';
import { AccessibilityPage, AppearancePage, LanguagePage, SystemPage, VoicePage } from './pages/ExperiencePages';
import { ActivityPage, ConnectionsPage, DeveloperPage } from './pages/AppsPages';

/*
 * Parametres utilisateur, refaits d'apres la video Discord 2025 :
 * fenetre flottante, barre laterale (avatar + "Modifier les profils",
 * recherche, groupes), sous-sections de la page active avec un trait qui
 * suit le defilement, contenu centre et titre de la page en haut.
 */

const PAGES: Record<UserSettingsPage, React.ComponentType> = {
  profile: ProfileSettingsTab,
  account: AccountPage,
  privacy: PrivacyPage,
  messaging: MessagingPage,
  notifications: NotificationsPage,
  voice: VoicePage,
  appearance: AppearancePage,
  accessibility: AccessibilityPage,
  system: SystemPage,
  language: LanguagePage,
  activity: ActivityPage,
  connections: ConnectionsPage,
  developer: DeveloperPage,
};

const pageLabel = (p: UserSettingsPage) => (p === 'profile' ? 'Profils' : ALL_NAV_PAGES.find((x) => x.id === p)?.label ?? '');

interface Props {
  onClose: () => void;
  initialTab?: string | null;
}

export function UserSettingsModal({ onClose, initialTab }: Props) {
  const { isMobile } = useBreakpoint();
  const { profile, signOut } = useAuth();
  useUserSettings(); // charge les parametres depuis la base
  const [page, setPage] = useState<UserSettingsPage | null>(() => resolveSettingsPage(initialTab) ?? (isMobile ? null : 'account'));
  const [query, setQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingSection = useRef<string | null>(null);

  const navPage = page ? ALL_NAV_PAGES.find((p) => p.id === page) : undefined;
  const sectionIds = useMemo(() => navPage?.sections.map((s) => s.id) ?? [], [navPage]);
  const activeSection = useSettingsScrollSpy(contentRef, sectionIds);

  const goTo = (p: UserSettingsPage, section?: string) => {
    setQuery('');
    if (p === page) {
      if (section) scrollToSettingsSection(contentRef.current, section);
      return;
    }
    pendingSection.current = section ?? null;
    setPage(p);
  };

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const target = pendingSection.current;
    pendingSection.current = null;
    requestAnimationFrame(() => {
      if (target) scrollToSettingsSection(el, target);
      else el.scrollTop = 0;
    });
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Une fenetre ou un menu ouvert au-dessus se ferme d'abord.
      if (document.querySelector('[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return ALL_NAV_PAGES.flatMap((p) => {
      const pageHit = p.label.toLowerCase().includes(q);
      const sections = p.sections.filter((s) => s.label.toLowerCase().includes(q) || s.keywords?.toLowerCase().includes(q));
      return pageHit || sections.length ? [{ page: p, sections: pageHit && !sections.length ? p.sections : sections }] : [];
    });
  }, [query]);

  const Content = page ? PAGES[page] : null;

  const sidebar = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-4 pb-2">
        <button type="button" onClick={() => goTo('profile')} className="w-full flex items-center gap-3 p-1.5 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))] text-left">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <span className="w-10 h-10 rounded-full bg-primary shrink-0 flex items-center justify-center text-white font-semibold">{(profile?.display_name || profile?.username || '?').charAt(0).toUpperCase()}</span>
          )}
          <span className="min-w-0">
            <span className="block text-base font-semibold text-white truncate">{profile?.display_name || profile?.username}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">Modifier les profils <Pencil className="w-3 h-3" /></span>
          </span>
        </button>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher dans les paramètres"
            className="w-full h-9 pl-8 pr-2 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.08] focus:border-primary text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 pb-4">
        {results ? (
          results.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
          ) : (
            results.map(({ page: p, sections }) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="mt-2">
                  <button type="button" onClick={() => goTo(p.id)} className="w-full flex items-center gap-2.5 h-9 px-2 rounded-lg text-left text-base font-medium text-white hover:bg-[hsl(var(--interactive-background-hover))]">
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </button>
                  {sections.map((s) => (
                    <button key={s.id} type="button" onClick={() => goTo(p.id, s.id)} className="w-full h-8 pl-9 pr-2 rounded-lg text-left text-sm text-muted-foreground hover:text-white hover:bg-[hsl(var(--interactive-background-hover))] truncate">
                      {s.label}
                    </button>
                  ))}
                </div>
              );
            })
          )
        ) : (
          USER_SETTINGS_NAV.map((g, gi) => (
            <div key={gi} className={cn(gi > 0 && 'mt-3 pt-3 border-t border-white/[0.06]')}>
              {g.label && <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">{g.label}</p>}
              {g.pages.map((p) => {
                const Icon = p.icon;
                const active = page === p.id;
                return (
                  <div key={p.id}>
                    <button
                      type="button"
                      onClick={() => goTo(p.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 min-h-9 py-1.5 px-2 rounded-lg text-left text-base font-medium transition-colors',
                        active ? 'bg-[hsl(var(--interactive-background-selected))] text-white' : 'text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-[hsl(var(--interactive-text-hover))]',
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1 leading-5">{p.label}</span>
                      {isMobile && <ChevronRight className="w-4 h-4" />}
                    </button>
                    {active && !isMobile && p.sections.length > 0 && (
                      <div className="ml-[18px] my-1 border-l border-white/[0.12]">
                        {p.sections.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => scrollToSettingsSection(contentRef.current, s.id)}
                            className={cn(
                              'relative w-full py-[7px] pl-4 pr-2 text-left text-sm leading-[18px] transition-colors',
                              activeSection === s.id ? 'text-white' : 'text-muted-foreground hover:text-white',
                            )}
                          >
                            {activeSection === s.id && <span className="absolute -left-px top-1 bottom-1 w-0.5 rounded-full bg-white" />}
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        {!results && (
          <button
            type="button"
            onClick={async () => {
              await signOut();
              onClose();
            }}
            className="mt-1 w-full flex items-center gap-2.5 h-9 px-2 rounded-lg text-left text-base font-medium text-[#f57976] hover:bg-[hsl(var(--interactive-background-hover))]"
          >
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        )}
      </nav>
    </div>
  );

  const body = (
    <UserSettingsNavContext.Provider value={{ goTo, close: onClose }}>
      <AccountSettingsContext.Provider value={{ close: onClose }}>
        {isMobile ? (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="h-12 px-2 flex items-center gap-1 shrink-0 border-b border-white/[0.06]">
              <button type="button" aria-label={page ? 'Retour' : 'Fermer'} onClick={() => (page ? setPage(null) : onClose())} className="p-2 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))]">
                {page ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
              <h1 className="flex-1 text-base font-semibold text-white truncate">{page ? pageLabel(page) : 'Paramètres'}</h1>
            </div>
            {page && Content ? (
              <div ref={contentRef} className="flex-1 overflow-y-auto px-4 pb-10">
                <Content />
              </div>
            ) : (
              <div className="flex-1 min-h-0 bg-[hsl(var(--card))]">{sidebar}</div>
            )}
          </div>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[min(6vh,64px)_min(6vw,120px)] animate-fade-in">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <div className="relative flex w-full h-full max-w-[1680px] max-h-[880px] rounded-lg overflow-hidden border border-white/[0.06] shadow-2xl animate-appear">
              <aside className="w-[290px] shrink-0 bg-[hsl(var(--card))] border-r border-white/[0.06]">{sidebar}</aside>
              <main className="flex-1 min-w-0 flex flex-col bg-background">
                <div className="h-11 shrink-0 flex items-center px-5">
                  <h1 className="flex-1 text-sm font-medium text-white truncate">{page ? pageLabel(page) : ''}</h1>
                  <button type="button" aria-label="Fermer" onClick={onClose} className="p-1 rounded text-[hsl(var(--icon-default))] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                  <div className={cn('mx-auto px-10 pb-16', page === 'profile' ? 'max-w-[1100px]' : 'max-w-[760px]')}>{Content && <Content />}</div>
                </div>
              </main>
            </div>
          </div>
        )}
      </AccountSettingsContext.Provider>
    </UserSettingsNavContext.Provider>
  );

  return createPortal(body, document.body);
}
