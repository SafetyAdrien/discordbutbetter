import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Info, Heart, Smile, Sticker, Users, Shield, Link, Lock, Ban, History, Trash2, Zap, Volume2, Puzzle, FileCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { ServerProfileSettings } from './ServerProfileSettings';
import { EngagementSettings } from './EngagementSettings';
import { EmojiManager } from './EmojiManager';
import { StickerManager } from './StickerManager';
import { MemberManager } from './MemberManager';
import { RoleManager } from './RoleManager';
import { InviteManager } from './InviteManager';
import { PrivacySettings } from './PrivacySettings';
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
  onClose
}: ServerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab | null>('profile');
  const { isMobile } = useBreakpoint();

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
    <nav className="space-y-4 p-2">
      {sections.map(section => (
        <div key={section.id}>
          <p className="text-xs font-semibold text-muted-foreground capitalize px-3 mb-1">
            {section.name === 'server' ? serverName : section.name}
          </p>
          <div className="space-y-0.5">
            {section.tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  isMobile ? 'py-3' : 'py-1.5',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{tab.label}</span>
                {isMobile && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Separator className="my-2" />
      <div className="space-y-0.5">
        {dangerTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 rounded-lg text-sm transition-colors',
              isMobile ? 'py-3' : 'py-1.5',
              activeTab === tab.id
                ? tab.danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                : tab.danger 
                  ? 'text-destructive/80 hover:bg-destructive/10 hover:text-destructive'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
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
            <div className="h-12 px-3 flex items-center gap-2 border-b border-border flex-shrink-0">
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-sm flex-1 truncate">{serverName}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavList((tab) => setActiveTab(tab))}
            </div>
          </>
        ) : (
          <>
            <div className="h-12 px-3 flex items-center gap-2 border-b border-border flex-shrink-0">
              <button onClick={() => setActiveTab(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className={cn("font-semibold text-sm flex-1 truncate", activeTab === 'delete' && "text-destructive")}>
                {getCurrentTabLabel()}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
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

  // Desktop: sidebar + content
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex w-full max-w-5xl m-auto max-h-[90vh] glass rounded-xl overflow-hidden">
        <div className="w-56 bg-card/50 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold truncate">{serverName}</h2>
            <p className="text-xs text-muted-foreground">Paramètres du serveur</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderNavList((tab) => setActiveTab(tab))}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-12 px-6 flex items-center justify-between border-b border-border">
            <h3 className={cn("font-semibold", activeTab === 'delete' && "text-destructive")}>
              {getCurrentTabLabel()}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
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
