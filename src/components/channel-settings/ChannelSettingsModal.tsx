import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('overview');
  const { data: channel, isLoading } = useChannelDetails(channelId);

  const Icon = channel?.type ? channelIcons[channel.type] : StreamlineHash;

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="integrations">Intégrations</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <ChannelOverview channel={channel} />
                <ChannelDangerZone channelId={channelId} channelName={channel.name} serverId={serverId} onDeleted={onClose} />
              </TabsContent>

              <TabsContent value="permissions" className="mt-0">
                <ChannelPermissions channelId={channelId} serverId={serverId} />
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
