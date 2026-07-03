import { useMemo, useRef, useState } from 'react';
import {
  X,
  LogOut,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pencil,
  QrCode,
  Sparkles,
  Bell,
  HelpCircle,
  Search,
  Palette,
  User,
  Link2,
  Smartphone,
  AppWindow,
  Shield,
  Keyboard,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AccountSettings } from './AccountSettings';
import { AccountSettingsContext } from './AccountSettingsContext';
import { ProfileSettingsTab } from './ProfileSettingsTab';
import { PrivacySettings } from './PrivacySettings';
import { ConnectionsSettings } from './ConnectionsSettings';
import { AuthorizedAppsSettings } from './AuthorizedAppsSettings';
import { SessionsSettings } from './SessionsSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { KeybindsSettings } from './KeybindsSettings';
import { NotificationsSettings } from './NotificationsSettings';
import { ChatSettings } from './ChatSettings';
import { VoiceVideoSettings } from './VoiceVideoSettings';
import { AccessibilitySettings } from './AccessibilitySettings';
import { LanguageSettings } from './LanguageSettings';
import { DesktopSettings } from './DesktopSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { MarkdownHelpPage } from './MarkdownHelpPage';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { uuidToSnowflake } from '@/lib/snowflake';
import {
  IMPLEMENTED_TAB_DESCRIPTORS,
  SETTINGS_CATEGORY_LABELS,
  getTabsByCategory,
  type SettingsTabDescriptor,
  type UserSettingsTabType,
} from '@/lib/settings/SettingsTabTypes';
import { searchSettings, type SettingsSearchResult } from '@/lib/settings/SettingsSearchIndex';
import { getSectionsForTab, type SettingsSectionConfig } from '@/lib/settings/SettingsSectionRegistry';
import { useSettingsScrollSpy, scrollToSettingsSection } from '@/hooks/useSettingsScrollSpy';
import { useCategoryCasePreferences } from '@/hooks/useCategoryCasePreferences';
import { caseClass } from '@/lib/ui/categoryCase';

type SettingsTab = UserSettingsTabType | 'help-markdown';

interface AccountSettingsModalProps {
  onClose: () => void;
  initialTab?: SettingsTab | null;
}

const TAB_COMPONENTS: Partial<Record<UserSettingsTabType, React.ComponentType>> = {
  my_profile: ProfileSettingsTab,
  account_security: AccountSettings,
  privacy_safety: PrivacySettings,
  linked_accounts: ConnectionsSettings,
  authorized_apps: AuthorizedAppsSettings,
  devices: SessionsSettings,
  appearance: AppearanceSettings,
  keybinds: KeybindsSettings,
  notifications: NotificationsSettings,
  chat_settings: ChatSettings,
  voice_video: VoiceVideoSettings,
  accessibility: AccessibilitySettings,
  language: LanguageSettings,
  desktop_settings: DesktopSettings,
  advanced_settings: AdvancedSettings,
};

const HELP_TAB: SettingsTabDescriptor = {
  type: 'help-markdown' as UserSettingsTabType,
  category: 'app_settings',
  label: 'Aide · Markdown',
  icon: HelpCircle,
  implementedBy: 'MarkdownHelpPage',
};

function findTabDescriptor(tabId: SettingsTab): SettingsTabDescriptor | undefined {
  if (tabId === 'help-markdown') return HELP_TAB;
  return IMPLEMENTED_TAB_DESCRIPTORS.find((t) => t.type === tabId);
}

export function AccountSettingsModal({ onClose, initialTab }: AccountSettingsModalProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(
    initialTab !== undefined ? initialTab : (isMobile ? null : 'my_profile'),
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { signOut, user } = useAuth();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { prefs: casePrefs } = useCategoryCasePreferences();

  const activeSections: Array<SettingsSectionConfig> = useMemo(() => {
    if (!activeTab || activeTab === 'help-markdown') return [];
    return getSectionsForTab(activeTab);
  }, [activeTab]);

  const activeSectionIds = useMemo(() => activeSections.map((s) => s.id), [activeSections]);
  const activeSectionId = useSettingsScrollSpy(contentRef, activeSectionIds);

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation === 'SUPPRIMER') {
      toast.info('Fonctionnalité de suppression de compte non implémentée');
      setDeleteDialogOpen(false);
      setDeleteConfirmation('');
    }
  };

  const searchResults = useMemo<Array<SettingsSearchResult>>(() => {
    if (!searchQuery.trim()) return [];
    return searchSettings(
      searchQuery,
      IMPLEMENTED_TAB_DESCRIPTORS.map((t) => ({ type: t.type, label: t.label })),
    );
  }, [searchQuery]);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    // Repart du haut : sinon la position de scroll de l'onglet précédent
    // "fuit" visuellement sur le nouveau contenu pendant une frame.
    requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
    });
  };

  const renderContent = () => {
    if (activeTab === 'help-markdown') return <MarkdownHelpPage />;
    if (!activeTab) return null;
    const Component = TAB_COMPONENTS[activeTab];
    return Component ? <Component /> : null;
  };

  const renderNavList = (onSelect: (tab: SettingsTab) => void) => (
    <div className="py-4">
      <div className="px-4 mb-3 relative">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un réglage..."
          className="h-8 pl-8 text-sm bg-input"
        />
        <Search className="w-3.5 h-3.5 absolute left-[22px] top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>

      {searchQuery.trim() ? (
        <div className="px-2 space-y-2">
          {searchResults.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">Aucun résultat pour « {searchQuery} ».</p>
          ) : (
            searchResults.map((result) => {
              const descriptor = IMPLEMENTED_TAB_DESCRIPTORS.find((t) => t.type === result.tab.type);
              const Icon = descriptor?.icon ?? Settings;
              return (
                <button
                  key={result.tab.type}
                  onClick={() => onSelect(result.tab.type as SettingsTab)}
                  className="w-full text-left px-3 py-1.5 rounded-[10px] hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {result.tab.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 pl-6 truncate">
                    {result.matchedItems.map((item) => item.label).join(' · ')}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : (
        <>
          {getTabsByCategory().map(([category, categoryTabs]) => (
            <div key={category} className="mb-2">
              <div className="px-4 mb-1 mt-3 first:mt-0">
                <h3 className={cn("text-xs font-semibold text-muted-foreground tracking-wider", caseClass('userSettings', casePrefs) === 'normal-case' ? 'uppercase' : caseClass('userSettings', casePrefs))}>
                  {SETTINGS_CATEGORY_LABELS[category]}
                </h3>
              </div>
              <nav className="px-2 space-y-0.5">
                {categoryTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActiveTab = activeTab === tab.type;
                  return (
                    <div key={tab.type}>
                      <button
                        onClick={() => onSelect(tab.type)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 rounded-[10px] text-sm font-medium transition-all duration-300',
                          isMobile ? 'py-1' : 'py-0.5',
                          isActiveTab
                            ? 'bg-primary/12 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors duration-200',
                          isActiveTab ? 'bg-primary/15' : 'bg-muted/50'
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="flex-1 text-left">{tab.label}</span>
                        {isMobile && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {isActiveTab && !isMobile && activeSections.length > 0 && (
                        <div className="ml-[19px] pl-4 border-l border-border/40 mt-1 mb-1 space-y-0.5">
                          {activeSections.map((section) => (
                            <button
                              key={section.id}
                              onClick={() => scrollToSettingsSection(contentRef.current, section.id)}
                              className={cn(
                                'w-full text-left px-2 py-0.5 rounded-[10px] text-xs transition-colors duration-150',
                                activeSectionId === section.id
                                  ? 'text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {section.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          ))}

          <div className="mb-2">
            <div className="px-4 mb-1 mt-3">
              <h3 className={cn("text-xs font-semibold text-muted-foreground tracking-wider", caseClass('userSettings', casePrefs) === 'normal-case' ? 'uppercase' : caseClass('userSettings', casePrefs))}>Aide</h3>
            </div>
            <nav className="px-2 space-y-0.5">
              <button
                onClick={() => onSelect('help-markdown')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 rounded-[10px] text-sm font-medium transition-all duration-300',
                  isMobile ? 'py-1' : 'py-0.5',
                  activeTab === 'help-markdown'
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}
              >
                <div className={cn(
                  'w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors duration-200',
                  activeTab === 'help-markdown' ? 'bg-primary/15' : 'bg-muted/50'
                )}>
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">Aide · Markdown</span>
                {isMobile && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            </nav>
          </div>
        </>
      )}

      <div className="px-2 mt-6">
        <div className="h-px bg-border/50 mb-2 mx-2 rounded-full" />
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-sm font-medium text-destructive hover:bg-destructive/8 transition-all duration-200">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-destructive/10">
            <LogOut className="w-4 h-4" />
          </div>
          Se déconnecter
        </button>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-[10px] text-sm font-medium text-destructive/60 hover:bg-destructive/5 transition-all duration-200">
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-destructive/5">
                <Trash2 className="w-4 h-4" />
              </div>
              Supprimer mon compte
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <span>Cette action est irréversible. Toutes vos données seront définitivement supprimées.</span>
                <div className="pt-2">
                  <Label htmlFor="delete-confirm-sidebar" className="text-sm font-medium">
                    Tapez <span className="font-bold text-destructive">SUPPRIMER</span> pour confirmer
                  </Label>
                  <Input id="delete-confirm-sidebar" className="mt-2 rounded-xl" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="SUPPRIMER" />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation('')} className="rounded-[10px]">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[10px]" disabled={deleteConfirmation !== 'SUPPRIMER'}>
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  const renderMobileSettingsHome = () => (
    <div className="pb-8">
      <SettingsSection title="Compte">
        <SettingsRow icon={<User className="w-4 h-4 text-muted-foreground" />} label="Mon compte" onClick={() => selectTab('account_security')} />
        <SettingsDivider />
        <SettingsRow icon={<Pencil className="w-4 h-4 text-muted-foreground" />} label="Modifier le profil" onClick={() => selectTab('my_profile')} />
        <SettingsDivider />
        <SettingsRow icon={<QrCode className="w-4 h-4 text-muted-foreground" />} label="Mon code QR" onClick={() => toast.info('Bientôt disponible')} />
        <SettingsDivider />
        <SettingsRow icon={<Link2 className="w-4 h-4 text-muted-foreground" />} label="Connexions" onClick={() => selectTab('linked_accounts')} />
        <SettingsDivider />
        <SettingsRow icon={<Smartphone className="w-4 h-4 text-muted-foreground" />} label="Sessions actives" onClick={() => selectTab('devices')} />
        <SettingsDivider />
        <SettingsRow icon={<AppWindow className="w-4 h-4 text-muted-foreground" />} label="Applications autorisées" onClick={() => selectTab('authorized_apps')} />
        <SettingsDivider />
        <SettingsRow icon={<Sparkles className="w-4 h-4 text-muted-foreground" />} label="Boost & avantages" onClick={() => toast.info('Bientôt disponible')} />
      </SettingsSection>

      <SettingsSection title="Préférences">
        <SettingsRow icon={<Palette className="w-4 h-4 text-muted-foreground" />} label="Apparence" onClick={() => selectTab('appearance')} />
        <SettingsDivider />
        <SettingsRow icon={<Keyboard className="w-4 h-4 text-muted-foreground" />} label="Raccourcis clavier" onClick={() => selectTab('keybinds')} />
        <SettingsDivider />
        <SettingsRow icon={<Bell className="w-4 h-4 text-muted-foreground" />} label="Notifications" onClick={() => selectTab('notifications')} />
        <SettingsDivider />
        <SettingsRow icon={<Shield className="w-4 h-4 text-muted-foreground" />} label="Confidentialité & sécurité" onClick={() => selectTab('privacy_safety')} />
      </SettingsSection>

      <SettingsSection title="Aide">
        <SettingsRow icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />} label="Guide Markdown" onClick={() => selectTab('help-markdown')} />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />} label="Aide & FAQ" onClick={() => toast.info('Bientôt disponible')} />
        <SettingsDivider />
        <SettingsRow icon={<Settings className="w-4 h-4 text-muted-foreground" />} label="Paramètres avancés" onClick={() => selectTab('account_security')} />
      </SettingsSection>

      <section className="mx-4 mt-6 rounded-[10px] bg-card border border-border/50 overflow-hidden">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive active:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </section>

      <p className="text-center text-[11px] text-muted-foreground/60 mt-4 px-4">
        ID · {user?.id ? uuidToSnowflake(user.id) : '—'}
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <AccountSettingsContext.Provider value={{ close: onClose }}>
      <div className="fixed inset-0 z-50 flex flex-col bg-background">

        {activeTab === null ? (
          <>
            <div className="h-12 px-3 flex items-center gap-2 border-b border-border flex-shrink-0">
              <button onClick={onClose} className="w-9 h-9 rounded-[10px] flex items-center justify-center active:bg-muted/60" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-base flex-1">Paramètres</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderMobileSettingsHome()}
            </div>
          </>
        ) : (
          <>
            <div className="h-14 px-3 flex items-center gap-2 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl" style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
              <button onClick={() => setActiveTab(null)} className="p-1.5 rounded-[10px] hover:bg-muted">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="font-semibold text-sm flex-1 truncate">
                {findTabDescriptor(activeTab)?.label}
              </h1>
              <button onClick={onClose} className="p-1.5 rounded-[10px] hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl">{renderContent()}</div>
            </div>
          </>
        )}
      </div>
      </AccountSettingsContext.Provider>
    );
  }

  return (
    <AccountSettingsContext.Provider value={{ close: onClose }}>
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative flex w-full m-auto rounded-3xl overflow-hidden',
          isTablet ? 'max-w-[98vw] max-h-[96vh]' : 'max-w-7xl max-h-[92vh]'
        )}
        style={{ boxShadow: 'var(--shadow-elevation-3)' }}
      >
        <div className={cn(
          'bg-[hsl(var(--surface-1))] flex flex-col border-r border-border/30',
          isTablet ? 'w-52' : 'w-60'
        )}>
          <div className="flex-1 overflow-y-auto">
            {renderNavList((tab) => selectTab(tab))}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          <div className={cn(
            'flex items-center justify-between border-b border-border/30 flex-shrink-0',
            isTablet ? 'h-12 px-4' : 'h-14 px-6'
          )}>
            <h1 className={cn('font-semibold truncate', isTablet ? 'text-base' : 'text-lg')}>
              {activeTab ? findTabDescriptor(activeTab)?.label : ''}
            </h1>
            <button onClick={onClose} className="p-1.5 rounded-[10px] hover:bg-muted transition-all duration-200 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            ref={contentRef}
            className={cn(
              'flex-1',
              // L'onglet Profil gère son propre scroll en interne (colonne
              // gauche défilante, colonne droite fixe pour la preview — voir
              // ProfileSettingsTab.tsx) plutôt que de compter sur position:sticky
              // dans un ancêtre scrollable, qui s'est révélé peu fiable ici.
              // Tous les autres onglets gardent le scroll classique.
              activeTab === 'my_profile' ? 'overflow-hidden' : 'overflow-y-auto',
              isTablet ? 'p-4' : 'p-6'
            )}
          >
            <div className={cn('max-w-none', activeTab === 'my_profile' && 'h-full')}>{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
    </AccountSettingsContext.Provider>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <section className="mx-4 rounded-[10px] bg-card border border-border/50 overflow-hidden">
        {children}
      </section>
    </>
  );
}

function SettingsDivider() {
  return <div className="h-px bg-border/40 mx-4" />;
}

function SettingsRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-muted/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-muted/40">{icon}</div>
      <div className="flex-1 text-left text-sm font-medium">{label}</div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
