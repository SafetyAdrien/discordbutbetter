import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ChevronLeft, X } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { ChannelOverview } from './ChannelOverview';
import { ChannelPermissions } from './ChannelPermissions';
import { ChannelWebhooks } from './ChannelWebhooks';
import { ChannelDangerZone } from './ChannelDangerZone';
import { useChannelDetails } from '@/hooks/useChannelSettings';
import { ChannelType } from '@/constants/permissions';

interface ChannelSettingsModalProps {
  channelId: string;
  serverId: string;
  onClose: () => void;
}

const channelIcons = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
};

export function ChannelSettingsModal({ channelId, serverId, onClose }: ChannelSettingsModalProps) {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<string | null>(isMobile ? null : 'overview');
  const { data: channel, isLoading } = useChannelDetails(channelId);

  const Icon = channel?.type ? channelIcons[channel.type] : StreamlineHash;

  const tabItems = [
    { id: 'overview', label: 'Aperçu' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'integrations', label: 'Intégrations' },
  ];

  const renderTabContent = () => {
    if (!channel) return null;
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <ChannelOverview channel={channel} />
            <ChannelDangerZone channelId={channelId} channelName={channel.name} serverId={serverId} onDeleted={onClose} />
          </div>
        );
      case 'permissions':
        return <ChannelPermissions channelId={channelId} serverId={serverId} channelType={channel.type as ChannelType} />;
      case 'integrations':
        return <ChannelWebhooks channelId={channelId} />;
      default:
        return null;
    }
  };

  // Mobile: direct layout with Overview + tabs
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="h-12 px-3 flex items-center gap-2 border-b border-border flex-shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm flex-1 truncate">Paramètres de {channel?.name || 'salon'}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : channel ? (
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Aperçu</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="integrations">Intégrations</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4 space-y-6">
                <ChannelOverview channel={channel} />
                <ChannelDangerZone channelId={channelId} channelName={channel.name} serverId={serverId} onDeleted={onClose} />
              </TabsContent>
              <TabsContent value="permissions" className="mt-4">
                <ChannelPermissions channelId={channelId} serverId={serverId} channelType={channel.type as ChannelType} />
              </TabsContent>
              <TabsContent value="integrations" className="mt-4">
                <ChannelWebhooks channelId={channelId} />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-muted-foreground text-center py-8">Salon introuvable</p>
          )}
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-muted-foreground" />
            Paramètres de {channel?.name || 'salon'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : channel ? (
          <Tabs value={activeTab || 'overview'} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              {tabItems.map(item => (
                <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <ChannelOverview channel={channel} />
                <ChannelDangerZone channelId={channelId} channelName={channel.name} serverId={serverId} onDeleted={onClose} />
              </TabsContent>
              <TabsContent value="permissions" className="mt-0">
                <ChannelPermissions channelId={channelId} serverId={serverId} channelType={channel.type as ChannelType} />
              </TabsContent>
              <TabsContent value="integrations" className="mt-0">
                <ChannelWebhooks channelId={channelId} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <p className="text-muted-foreground text-center py-8">Salon introuvable</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
