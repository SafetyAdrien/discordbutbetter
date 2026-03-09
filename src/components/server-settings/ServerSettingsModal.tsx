import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Info, Heart, Smile, Sticker, Users, Shield, Link, Ban, History, Trash2, Zap, Volume2, Puzzle, FileCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { ServerProfileSettings } from './ServerProfileSettings';
import { EngagementSettings } from './EngagementSettings';
import { EmojiManager } from './EmojiManager';
import { StickerManager } from './StickerManager';
import { MemberManager } from './MemberManager';
import { RoleManager } from './RoleManager';
import { InviteManager } from './InviteManager';
import { BannedMembersManager } from './BannedMembersManager';
import { AuditLogManager } from './AuditLogManager';
import { BoostBenefitsPage } from './BoostBenefitsPage';
import { SoundBoardPage } from './SoundBoardPage';
import { IntegrationsPage } from './IntegrationsPage';
import { ServerTemplatePage } from './ServerTemplatePage';
import { ServerDeletePage } from './ServerDeletePage';
import { Separator } from '@/components/ui/separator';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ServerSettingsModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
  initialTab?: SettingsTab;
}

type SettingsTab = 
  | 'profile' | 'engagement' | 'boost'
  | 'emojis' | 'stickers' | 'soundboard'
  | 'members' | 'roles' | 'invites'
  | 'integrations'
  | 'audit' | 'banned'
  | 'template' | 'delete';

interface Section {
  id: string;
  name: string | 'server';
  tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    danger?: boolean;
  }[];
}

export function ServerSettingsModal({
  serverId,
  serverName,
  onClose,
  initialTab,
}: ServerSettingsModalProps) {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(initialTab ?? (isMobile ? null : 'profile'));

  const sections: Section[] = [
    {
      id: 'server', name: 'server',
      tabs: [
        { id: 'profile', label: 'Profil du serveur', icon: Info },
        { id: 'engagement', label: 'Engagement', icon: Heart },
        { id: 'boost', label: 'Avantages Boost', icon: Zap }
      ]
    },
    {
      id: 'expressions', name: 'Expressions',
      tabs: [
        { id: 'emojis', label: 'Émojis', icon: Smile },
        { id: 'stickers', label: 'Stickers', icon: Sticker },
        { id: 'soundboard', label: 'SoundBoard', icon: Volume2 }
      ]
    },
    {
      id: 'people', name: 'Personnes',
      tabs: [
        { id: 'members', label: 'Membres', icon: Users },
        { id: 'roles', label: 'Rôles', icon: Shield },
        { id: 'invites', label: 'Invitations', icon: Link }
      ]
    },
    {
      id: 'apps', name: 'Apps',
      tabs: [{ id: 'integrations', label: 'Intégrations', icon: Puzzle }]
    },
    {
      id: 'moderation', name: 'Modérations',
      tabs: [
        { id: 'audit', label: 'Audit Log', icon: History },
        { id: 'banned', label: 'Bannis', icon: Ban }
      ]
    }
  ];

  const dangerTabs: Section['tabs'] = [
    { id: 'template', label: 'Template de serveur', icon: FileCode },
    { id: 'delete', label: 'Supprimer le serveur', icon: Trash2, danger: true }
  ];

  const getCurrentTabLabel = () => {
    for (const section of sections) {
      const tab = section.tabs.find(t => t.id === activeTab);
      if (tab) return tab.label;
    }
    const dangerTab = dangerTabs.find(t => t.id === activeTab);
    if (dangerTab) return dangerTab.label;
    return '';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ServerProfileSettings serverId={serverId} />;
      case 'engagement': return <EngagementSettings serverId={serverId} />;
      case 'boost': return <BoostBenefitsPage serverId={serverId} />;
      case 'emojis': return <EmojiManager serverId={serverId} />;
      case 'stickers': return <StickerManager serverId={serverId} />;
      case 'soundboard': return <SoundBoardPage serverId={serverId} />;
      case 'members': return <MemberManager serverId={serverId} />;
      case 'roles': return <RoleManager serverId={serverId} />;
      case 'invites': return <InviteManager serverId={serverId} />;
      case 'integrations': return <IntegrationsPage serverId={serverId} />;
      case 'audit': return <AuditLogManager serverId={serverId} />;
      case 'banned': return <BannedMembersManager serverId={serverId} />;
      case 'template': return <ServerTemplatePage serverId={serverId} />;
      case 'delete': return <ServerDeletePage serverId={serverId} onClose={onClose} />;
      default: return null;
    }
  };

  const renderNavList = (onSelect: (tab: SettingsTab) => void) => (
    <nav className="space-y-2 p-2.5">
      {sections.map(section => (
        <div key={section.id}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
            {section.name === 'server' ? serverName : section.name}
          </p>
          <div className="space-y-0.5">
            {section.tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 rounded-2xl text-sm transition-all duration-300',
                  isMobile ? 'py-3' : 'py-1',
                  activeTab === tab.id
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
                style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200',
                  'bg-transparent'
                )}>
                  <tab.icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{tab.label}</span>
                {isMobile && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="h-px bg-border/50 mx-2 rounded-full" />
      <div className="space-y-0.5">
        {dangerTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 rounded-2xl text-sm transition-all duration-300',
              isMobile ? 'py-3' : 'py-2',
              activeTab === tab.id
                ? tab.danger ? 'bg-destructive/8 text-destructive font-medium' : 'bg-muted text-foreground font-medium'
                : tab.danger 
                  ? 'text-destructive/70 hover:bg-destructive/5 hover:text-destructive'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
            style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200',
              activeTab === tab.id
                ? tab.danger ? 'bg-destructive/15' : 'bg-primary/15'
                : tab.danger ? 'bg-destructive/5' : 'bg-transparent'
            )}>
              <tab.icon className="w-4 h-4" />
            </div>
            <span className="flex-1 text-left">{tab.label}</span>
            {isMobile && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
        ))}
      </div>
    </nav>
  );

  // Mobile: 2-level navigation
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {activeTab === null ? (
          <>
            <div className="h-14 px-3 flex items-center gap-2 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl" style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-base flex-1 truncate">{serverName}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavList((tab) => setActiveTab(tab))}
            </div>
          </>
        ) : (
          <>
            <div className="h-14 px-3 flex items-center gap-2 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl" style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
              <button onClick={() => setActiveTab(null)} className="p-2 rounded-full hover:bg-muted">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className={cn("font-semibold text-sm flex-1 truncate", activeTab === 'delete' && "text-destructive")}>
                {getCurrentTabLabel()}
              </h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
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

  // Desktop: Material You elevated modal
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-5xl m-auto max-h-[90vh] rounded-3xl overflow-hidden" style={{ boxShadow: 'var(--shadow-elevation-3)' }}>
        <div className="w-60 bg-[hsl(var(--surface-1))] border-r border-border/30 flex flex-col">
          <div className="p-4 border-b border-border/30">
            <h2 className="text-lg font-semibold truncate">{serverName}</h2>
            <p className="text-xs text-muted-foreground">Paramètres du serveur</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderNavList((tab) => setActiveTab(tab))}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="h-14 px-6 flex items-center justify-between border-b border-border/30">
            <h3 className={cn("font-semibold text-lg", activeTab === 'delete' && "text-destructive")}>
              {getCurrentTabLabel()}
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-all duration-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
