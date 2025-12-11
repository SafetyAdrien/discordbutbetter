import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Settings, Shield, Smile, Sticker, Users, Info } from 'lucide-react';
import { GeneralSettings } from './GeneralSettings';
import { RoleManager } from './RoleManager';
import { EmojiManager } from './EmojiManager';
import { StickerManager } from './StickerManager';

interface ServerSettingsModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

type SettingsTab = 'general' | 'roles' | 'emojis' | 'stickers' | 'security';

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'general', label: 'Général', icon: Info },
  { id: 'roles', label: 'Rôles', icon: Shield },
  { id: 'emojis', label: 'Emojis', icon: Smile },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
];

export function ServerSettingsModal({ serverId, serverName, onClose }: ServerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative flex w-full max-w-5xl m-auto max-h-[90vh] glass rounded-xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-card/50 border-r border-border p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-1 truncate">{serverName}</h2>
          <p className="text-xs text-muted-foreground mb-4">Paramètres du serveur</p>

          <nav className="space-y-1 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-12 px-6 flex items-center justify-between border-b border-border">
            <h3 className="font-semibold">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && <GeneralSettings serverId={serverId} />}
            {activeTab === 'roles' && <RoleManager serverId={serverId} />}
            {activeTab === 'emojis' && <EmojiManager serverId={serverId} />}
            {activeTab === 'stickers' && <StickerManager serverId={serverId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
