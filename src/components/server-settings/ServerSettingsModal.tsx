import { ServerTagSettings } from './ServerTagSettings';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Trash2 } from '@/components/icons/discord/lucide';
import { X } from '@/components/icons/serverSettingsIcons';
import { ServerProfileSettings } from './ServerProfileSettings';
import { EngagementSettings } from './EngagementSettings';
import { ServerChannelsManager } from './ServerChannelsManager';
import { EmojiManager } from './EmojiManager';
import { StickerManager } from './StickerManager';
import { MemberManager } from './MemberManager';
import { RoleManager } from './RoleManager';
import { ConnectionRulesManager } from './ConnectionRulesManager';
import { InviteManager } from './InviteManager';
import { BannedMembersManager } from './BannedMembersManager';
import { AuditLogManager } from './AuditLogManager';
import { BoostBenefitsPage } from './BoostBenefitsPage';
import { SoundBoardPage } from './SoundBoardPage';
import { IntegrationsPage } from './IntegrationsPage';
import { ServerTemplatePage } from './ServerTemplatePage';
import { ServerDeletePage } from './ServerDeletePage';
import { AccessSettings } from './AccessSettings';
import { SecuritySettings } from './SecuritySettings';
import { AutoModSettings } from './AutoModSettings';
import { CommunityComingSoon, CommunitySettings } from './CommunitySettings';
import { OnboardingSettings } from './OnboardingSettings';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useServerSettings } from '@/hooks/useServerSettings';

interface ServerSettingsModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
  initialTab?: SettingsTab;
}

type SettingsTab =
  | 'profile' | 'tag' | 'channels' | 'engagement' | 'boost'
  | 'emojis' | 'stickers' | 'soundboard'
  | 'members' | 'roles' | 'invites' | 'access' | 'connection-rules'
  | 'integrations'
  | 'security' | 'audit' | 'banned' | 'automod'
  | 'community' | 'onboarding' | 'analytics'
  | 'template' | 'delete';

interface NavTab {
  id: SettingsTab;
  label: string;
  danger?: boolean;
}

interface Section {
  id: string;
  /** null : section sans titre (communaute, modele, suppression). */
  name: string | null;
  tabs: NavTab[];
}

/*
 * Fenetre de parametres du serveur, reprise de la video de reference :
 * barre laterale grise dont la navigation (sans icones) est calee a droite,
 * groupes "Expression / Personnes / Applications / Moderation", puis
 * contenu de 740px max et bouton ESC rond a sa droite. Les onglets propres a
 * l'app (Salons, Criteres de connexion) restent dans leurs groupes.
 */
export function ServerSettingsModal({
  serverId,
  serverName,
  onClose,
  initialTab,
}: ServerSettingsModalProps) {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(initialTab ?? (isMobile ? null : 'profile'));
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const { data: settings } = useServerSettings(serverId);
  const communityEnabled = settings?.community_enabled ?? false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Une fenetre ouverte par-dessus (dialogue) gere elle-meme Echap.
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections: Section[] = [
    {
      id: 'server', name: serverName,
      tabs: [
        { id: 'profile', label: 'Profil du serveur' },
        { id: 'tag', label: 'Tag du serveur' },
        { id: 'channels', label: 'Salons' },
        { id: 'engagement', label: 'Participation' },
        { id: 'boost', label: 'Avantages de boost' },
      ],
    },
    {
      id: 'expression', name: 'Expression',
      tabs: [
        { id: 'emojis', label: 'Émoji' },
        { id: 'stickers', label: 'Autocollants' },
        { id: 'soundboard', label: 'Soundboard' },
      ],
    },
    {
      id: 'people', name: 'Personnes',
      tabs: [
        { id: 'members', label: 'Membres' },
        { id: 'roles', label: 'Rôles' },
        { id: 'invites', label: 'Invitations' },
        { id: 'access', label: 'Accès' },
        { id: 'connection-rules', label: 'Critères de connexion' },
      ],
    },
    {
      id: 'apps', name: 'Applications',
      tabs: [{ id: 'integrations', label: 'Intégrations' }],
    },
    {
      id: 'moderation', name: 'Modération',
      tabs: [
        { id: 'security', label: 'Configuration de Sécurité' },
        { id: 'audit', label: 'Logs du serveur' },
        { id: 'banned', label: 'Bannissements' },
        { id: 'automod', label: 'AutoMod' },
      ],
    },
    communityEnabled
      ? {
          id: 'community', name: 'Communauté',
          tabs: [
            { id: 'community', label: "Vue d'ensemble de la communauté" },
            { id: 'onboarding', label: "Processus d'accueil" },
            { id: 'analytics', label: 'Analyses de serveur' },
          ],
        }
      : { id: 'community', name: null, tabs: [{ id: 'community', label: 'Activer la communauté' }] },
    {
      id: 'end', name: null,
      tabs: [
        { id: 'template', label: 'Modèle de serveur' },
        { id: 'delete', label: 'Supprimer le serveur', danger: true },
      ],
    },
  ];

  const getCurrentTabLabel = () => {
    for (const section of sections) {
      const tab = section.tabs.find((t) => t.id === activeTab);
      if (tab) return tab.label;
    }
    return '';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ServerProfileSettings serverId={serverId} />;
      case 'tag': return <ServerTagSettings serverId={serverId} />;
      case 'channels': return <ServerChannelsManager serverId={serverId} />;
      case 'engagement': return <EngagementSettings serverId={serverId} />;
      case 'boost': return <BoostBenefitsPage serverId={serverId} />;
      case 'emojis': return <EmojiManager serverId={serverId} />;
      case 'stickers': return <StickerManager serverId={serverId} />;
      case 'soundboard': return <SoundBoardPage serverId={serverId} />;
      case 'members': return <MemberManager serverId={serverId} />;
      case 'roles': return <RoleManager serverId={serverId} />;
      case 'invites': return <InviteManager serverId={serverId} />;
      case 'access': return <AccessSettings serverId={serverId} />;
      case 'connection-rules': return <ConnectionRulesManager serverId={serverId} />;
      case 'integrations': return <IntegrationsPage serverId={serverId} />;
      case 'security': return <SecuritySettings serverId={serverId} />;
      case 'audit': return <AuditLogManager serverId={serverId} />;
      case 'banned': return <BannedMembersManager serverId={serverId} />;
      case 'automod': return <AutoModSettings serverId={serverId} />;
      case 'community': return <CommunitySettings serverId={serverId} onNavigate={(tab) => setActiveTab(tab)} />;
      case 'onboarding': return <OnboardingSettings serverId={serverId} onStepChange={setOnboardingStep} />;
      case 'analytics': return <CommunityComingSoon kind="analytics" />;
      case 'template': return <ServerTemplatePage serverId={serverId} />;
      case 'delete': return <ServerDeletePage serverId={serverId} onClose={onClose} />;
      default: return null;
    }
  };

  const renderNavList = (onSelect: (tab: SettingsTab) => void) => (
    <nav>
      {sections.map((section, i) => (
        <div key={section.id}>
          {i > 0 && <div className="h-px mx-2.5 my-2 bg-[hsl(var(--frame-border))]" />}
          {section.name && (
            <p className="px-2.5 pt-1.5 pb-1 text-sm text-muted-foreground truncate">{section.name}</p>
          )}
          <div className="space-y-0.5">
            {section.tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 rounded-lg text-left text-base font-medium transition-colors',
                  isMobile ? 'h-11' : 'h-8',
                  tab.danger
                    ? 'text-[hsl(var(--destructive))] hover:bg-[hsl(var(--interactive-background-hover))]'
                    : activeTab === tab.id
                      ? 'bg-[hsl(var(--interactive-background-selected))] text-white'
                      : 'text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-[hsl(var(--interactive-text-hover))]',
                  tab.danger && activeTab === tab.id && 'bg-[hsl(var(--interactive-background-selected))]',
                )}
              >
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.id === 'onboarding' && onboardingStep !== null && (
                  <span className="shrink-0 text-sm text-muted-foreground">{onboardingStep + 1} sur 5</span>
                )}
                {tab.danger && <Trash2 className="w-4 h-4 shrink-0" />}
                {isMobile && !tab.danger && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  // Mobile: 2-level navigation
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {activeTab === null ? (
          <>
            <div className="h-14 px-3 flex items-center gap-2 bg-[hsl(var(--surface-1))] flex-shrink-0 border-b border-[hsl(var(--frame-border))]">
              <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
              <h2 translate="no" className="font-semibold text-base flex-1 truncate">{serverName}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 bg-[hsl(var(--surface-1))]">
              {renderNavList((tab) => setActiveTab(tab))}
            </div>
          </>
        ) : (
          <>
            <div className="h-14 px-3 flex items-center gap-2 bg-[hsl(var(--surface-1))] flex-shrink-0 border-b border-[hsl(var(--frame-border))]">
              <button type="button" onClick={() => setActiveTab(null)} aria-label="Retour" className="p-2 rounded-full hover:bg-muted">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className={cn('font-semibold text-sm flex-1 truncate', activeTab === 'delete' && 'text-destructive')}>
                {getCurrentTabLabel()}
              </h3>
              <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderContent()}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop / Tablet: plein ecran, comme Discord
  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      <aside className="flex-[1_0_218px] flex justify-end bg-[hsl(var(--sidebar-background))] overflow-y-auto scrollbar-thin">
        <div className="w-[260px] shrink-0 pt-[60px] pb-10 pl-5 pr-2">
          {renderNavList((tab) => setActiveTab(tab))}
        </div>
      </aside>
      <main className="flex-[1_1_800px] min-w-0 overflow-y-auto scrollbar-thin">
        <div className="flex">
          <div className="flex-1 min-w-0 max-w-[740px] px-10 pt-[60px]">
            {renderContent()}
          </div>
          <div className="w-[72px] shrink-0 pt-[60px]">
            <div className="sticky top-[60px] flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full border-2 border-[hsl(var(--header-icon))] text-[hsl(var(--header-icon))] hover:border-white hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[13px] font-semibold text-[hsl(var(--header-icon))]">ESC</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
