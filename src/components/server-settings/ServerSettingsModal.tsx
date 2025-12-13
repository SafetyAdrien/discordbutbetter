import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Info, Heart, Smile, Sticker, Users, Shield, Link, Lock, Ban, History } from 'lucide-react';
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

interface ServerSettingsModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

type SettingsTab = 'profile' | 'engagement' | 'emojis' | 'stickers' | 'members' | 'roles' | 'invites' | 'privacy' | 'banned' | 'audit';

interface Section {
  id: string;
  name: string | 'server';
  tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
  }[];
}

const sections: Section[] = [
  {
    id: 'server',
    name: 'server',
    tabs: [
      { id: 'profile', label: 'Profil du serveur', icon: Info },
      { id: 'engagement', label: 'Engagement', icon: Heart }
    ]
  },
  {
    id: 'expressions',
    name: 'Expressions',
    tabs: [
      { id: 'emojis', label: 'Emojis', icon: Smile },
      { id: 'stickers', label: 'Autocollants', icon: Sticker }
    ]
  },
  {
    id: 'people',
    name: 'Personnes',
    tabs: [
      { id: 'members', label: 'Membres', icon: Users },
      { id: 'roles', label: 'Rôles', icon: Shield },
      { id: 'invites', label: 'Invites', icon: Link },
      { id: 'banned', label: 'Bannis', icon: Ban },
      { id: 'audit', label: "Journal d'audit", icon: History }
    ]
  },
  {
    id: 'discovery',
    name: 'Découvertes',
    tabs: [
      { id: 'privacy', label: 'Confidentialité', icon: Lock }
    ]
  }
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
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative flex w-full max-w-5xl m-auto max-h-[90vh] glass rounded-xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-card/50 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold truncate">{serverName}</h2>
            <p className="text-xs text-muted-foreground">Paramètres du serveur</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-4">
            {sections.map(section => (
              <div key={section.id}>
                {/* Section header */}
                <p className="text-xs font-semibold text-muted-foreground capitalize px-3 mb-1">
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
            {activeTab === 'emojis' && <EmojiManager serverId={serverId} />}
            {activeTab === 'stickers' && <StickerManager serverId={serverId} />}
            {activeTab === 'members' && <MemberManager serverId={serverId} />}
            {activeTab === 'roles' && <RoleManager serverId={serverId} />}
            {activeTab === 'invites' && <InviteManager serverId={serverId} />}
            {activeTab === 'banned' && <BannedMembersManager serverId={serverId} />}
            {activeTab === 'audit' && <AuditLogManager serverId={serverId} />}
            {activeTab === 'privacy' && <PrivacySettings serverId={serverId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
