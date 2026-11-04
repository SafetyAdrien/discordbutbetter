import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ChevronLeft, ChevronRight, X, Trash2 } from '@/components/icons/discord/lucide';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineLink } from '@/components/icons/StreamlineLink';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { ChannelOverview } from './ChannelOverview';
import { ChannelPermissions } from './ChannelPermissions';
import { FollowedChannelsSettings } from './FollowedChannelsSettings';
import { ChannelWebhooks } from './ChannelWebhooks';
import { ChannelDangerZone } from './ChannelDangerZone';
import { ForumOverviewSettings } from './ForumOverviewSettings';
import { useChannelDetails } from '@/hooks/useChannelSettings';
import { useChannels } from '@/hooks/useChannels';
import { ChannelType } from '@/constants/permissions';

/*
 * Parametres d'un salon, plein ecran comme Discord (videos de reference) :
 * navigation a gauche ("# salon CATEGORIE", Vue d'ensemble, Permissions,
 * Integrations, Supprimer le salon), contenu au centre, fermeture ESC. Les
 * salons Forum et Multimedia ont leur propre Vue d'ensemble (guide des
 * posts, tags, reaction par defaut, mode lent...).
 */

export type ChannelSettingsTab = 'overview' | 'permissions' | 'integrations';

interface ChannelSettingsModalProps {
  channelId: string;
  serverId: string;
  onClose: () => void;
  initialTab?: ChannelSettingsTab;
}

const channelIcons: Record<string, React.ElementType> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  link: StreamlineLink,
  stage: StreamlineStage,
};

const TABS: { id: ChannelSettingsTab; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'permissions', label: 'Permissions' },
  { id: 'integrations', label: 'Intégrations' },
];

export function ChannelSettingsModal({ channelId, serverId, onClose, initialTab = 'overview' }: ChannelSettingsModalProps) {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<ChannelSettingsTab | null>(isMobile ? null : initialTab);
  const { data: channel, isLoading } = useChannelDetails(channelId);
  const { data: channelsData } = useChannels(serverId);
  const category = channelsData?.categories.find((c) => c.id === channel?.category_id);

  const Icon = (channel?.type && channelIcons[channel.type]) || StreamlineHash;
  const isThreadOnly = channel?.type === 'forum' || channel?.type === 'media';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const content = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    if (!channel) return <p className="text-muted-foreground text-center py-8">Salon introuvable</p>;
    switch (activeTab) {
      case 'overview':
        return isThreadOnly ? (
          <ForumOverviewSettings channel={channel} serverId={serverId} />
        ) : (
          <ChannelOverview channel={channel} channelId={channelId} channelName={channel.name} serverId={serverId} onDeleted={onClose} />
        );
      case 'permissions':
        return <ChannelPermissions channelId={channelId} serverId={serverId} channelType={channel.type as ChannelType} />;
      case 'integrations':
        return (
          <div className="space-y-8">
            <FollowedChannelsSettings channelId={channelId} serverId={serverId} channelName={channel.name} />
            <ChannelWebhooks channelId={channelId} />
          </div>
        );
      default:
        return null;
    }
  };

  const nav = (
    <nav aria-label="Paramètres du salon">
      <p className="px-2.5 pb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground truncate">
        <Icon className="w-3 h-3 shrink-0" size={12} />
        <span translate="no" className="truncate">{channel?.name}</span>
        {category && <span translate="no" className="truncate uppercase text-[hsl(var(--header-icon))]">{category.name}</span>}
      </p>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'w-full flex items-center gap-2 h-8 px-2.5 mb-0.5 rounded-[4px] text-left text-base font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-[hsl(var(--interactive-background-selected))] text-white'
              : 'text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-[hsl(var(--interactive-text-hover))]',
          )}
        >
          <span className="flex-1 truncate">{tab.label}</span>
          {isMobile && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
      ))}
      {channel && (
        <>
          <div className="mx-2.5 my-2 h-px bg-[hsl(var(--border-subtle))]" />
          <ChannelDangerZone
            channelId={channelId}
            channelName={channel.name}
            serverId={serverId}
            onDeleted={onClose}
            renderTrigger={(open) => (
              <button type="button" onClick={open} className="w-full flex items-center gap-2 h-8 px-2.5 rounded-[4px] text-left text-base font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--interactive-background-hover))]">
                <span className="flex-1">Supprimer le salon</span>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          />
        </>
      )}
    </nav>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="h-14 px-3 flex items-center gap-2 bg-[hsl(var(--surface-1))] flex-shrink-0 border-b border-[hsl(var(--frame-border))]">
          <button type="button" aria-label={activeTab ? 'Retour' : 'Fermer'} onClick={() => (activeTab ? setActiveTab(null) : onClose())} className="p-2 rounded-full hover:bg-muted">
            {activeTab ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
          <h2 className="font-semibold text-sm flex-1 truncate">{activeTab ? TABS.find((t) => t.id === activeTab)?.label : `Paramètres de ${channel?.name ?? 'salon'}`}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{activeTab ? content() : nav}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-background animate-fade-in">
      <aside className="flex-[1_0_218px] flex justify-end bg-[hsl(var(--sidebar-background))] overflow-y-auto scrollbar-thin">
        <div className="w-[218px] shrink-0 pt-[60px] pb-10 pl-5 pr-2">{nav}</div>
      </aside>
      <main className="flex-[1_1_800px] min-w-0 overflow-y-auto scrollbar-thin">
        <div className="flex">
          <div className="flex-1 min-w-0 max-w-[740px] px-10 pt-[60px] pb-20">{content()}</div>
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
