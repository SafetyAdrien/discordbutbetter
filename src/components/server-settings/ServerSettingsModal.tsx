import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Info, Heart, Zap, Smile, Sticker, Volume2, Users, Shield, Link, Puzzle, History, Ban, Copy, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ServerProfileSettings } from './ServerProfileSettings';
import { EngagementSettings } from './EngagementSettings';
import { BoostSettings } from './BoostSettings';
import { EmojiManager } from './EmojiManager';
import { StickerManager } from './StickerManager';
import { SoundBoardManager } from './SoundBoardManager';
import { MemberManager } from './MemberManager';
import { RoleManager } from './RoleManager';
import { InviteManager } from './InviteManager';
import { IntegrationsManager } from './IntegrationsManager';
import { AuditLogManager } from './AuditLogManager';
import { BannedMembersManager } from './BannedMembersManager';
import { ServerTemplateManager } from './ServerTemplateManager';
import { DeleteServerPage } from './DeleteServerPage';

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
  }[];
}

const sections: Section[] = [
  {
    id: 'server',
    name: 'server',
    tabs: [
      { id: 'profile', label: 'Profil du serveur', icon: Info },
      { id: 'engagement', label: 'Engagement', icon: Heart },
      { id: 'boost', label: 'Avantages Boost', icon: Zap }
    ]
  },
  {
    id: 'expressions',
    name: 'Expressions',
    tabs: [
      { id: 'emojis', label: 'Émojis', icon: Smile },
      { id: 'stickers', label: 'Stickers', icon: Sticker },
      { id: 'soundboard', label: 'SoundBoard', icon: Volume2 }
    ]
  },
  {
    id: 'people',
    name: 'Personnes',
    tabs: [
      { id: 'members', label: 'Membres', icon: Users },
      { id: 'roles', label: 'Rôles', icon: Shield },
      { id: 'invites', label: 'Invitations', icon: Link }
    ]
  },
  {
    id: 'apps',
    name: 'Apps',
    tabs: [
      { id: 'integrations', label: 'Intégrations', icon: Puzzle }
    ]
  },
  {
    id: 'moderation',
    name: 'Modérations',
    tabs: [
      { id: 'audit', label: "Journal d'audit", icon: History },
      { id: 'banned', label: 'Bannis', icon: Ban }
    ]
  }
];

const dangerTabs = [
  { id: 'template' as SettingsTab, label: 'Template de serveur', icon: Copy, danger: false },
  { id: 'delete' as SettingsTab, label: 'Supprimer le serveur', icon: Trash2, danger: true }
];

export function ServerSettingsModal({
  serverId,
  serverName,
  onClose
}: ServerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const getCurrentTabLabel = () => {
    for (const section of sections) {
      const tab = section.tabs.find(t => t.id === activeTab);
      if (tab) return tab.label;
    }
    const dangerTab = dangerTabs.find(t => t.id === activeTab);
    if (dangerTab) return dangerTab.label;
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative flex w-full max-w-5xl m-auto max-h-[90vh] glass rounded-xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-card/50 border-r border-border flex flex-col">
          {/* Header with server name */}
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold truncate">{serverName}</h2>
            <p className="text-xs text-muted-foreground">Paramètres du serveur</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-4">
            {sections.map(section => (
              <div key={section.id}>
                {/* Section header */}
                <p className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-1">
                  {section.name === 'server' ? serverName : section.name}
                </p>
                {/* Tabs in section */}
                <div className="space-y-0.5">
                  {section.tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                        activeTab === tab.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Separator before danger zone */}
            <Separator className="my-4" />

            {/* Danger Zone */}
            <div className="space-y-0.5">
              {dangerTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                    activeTab === tab.id
                      ? tab.danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                      : tab.danger 
                        ? 'text-destructive hover:bg-destructive/10' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-12 px-6 flex items-center justify-between border-b border-border">
            <h3 className="font-semibold">{getCurrentTabLabel()}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'profile' && <ServerProfileSettings serverId={serverId} />}
            {activeTab === 'engagement' && <EngagementSettings serverId={serverId} />}
            {activeTab === 'boost' && <BoostSettings serverId={serverId} />}
            {activeTab === 'emojis' && <EmojiManager serverId={serverId} />}
            {activeTab === 'stickers' && <StickerManager serverId={serverId} />}
            {activeTab === 'soundboard' && <SoundBoardManager serverId={serverId} />}
            {activeTab === 'members' && <MemberManager serverId={serverId} />}
            {activeTab === 'roles' && <RoleManager serverId={serverId} />}
            {activeTab === 'invites' && <InviteManager serverId={serverId} />}
            {activeTab === 'integrations' && <IntegrationsManager serverId={serverId} />}
            {activeTab === 'audit' && <AuditLogManager serverId={serverId} />}
            {activeTab === 'banned' && <BannedMembersManager serverId={serverId} />}
            {activeTab === 'template' && <ServerTemplateManager serverId={serverId} />}
            {activeTab === 'delete' && <DeleteServerPage serverId={serverId} serverName={serverName} onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}
