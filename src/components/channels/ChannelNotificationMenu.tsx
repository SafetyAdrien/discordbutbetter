import { 
  ContextMenuSub, 
  ContextMenuSubTrigger, 
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
} from '@/components/ui/context-menu';
import { Bell, BellOff, Clock, Check } from 'lucide-react';
import { 
  useMuteChannel, 
  useMuteCategory,
  useSetChannelNotification,
  useSetCategoryNotification,
  useUserChannelSettings,
  type MuteDuration,
  type NotificationSetting,
} from '@/hooks/useUserChannelSettings';

interface ChannelNotificationMenuProps {
  channelId?: string;
  categoryId?: string;
  serverId: string;
}

const MUTE_DURATIONS: { value: MuteDuration; label: string }[] = [
  { value: '15m', label: 'For 15 Minutes' },
  { value: '1h', label: 'For 1 Hour' },
  { value: '3h', label: 'For 3 Hours' },
  { value: '8h', label: 'For 8 Hours' },
  { value: '24h', label: 'For 24 Hours' },
  { value: 'forever', label: 'Until I turn it back on' },
];

const NOTIFICATION_SETTINGS: { value: NotificationSetting; label: string }[] = [
  { value: 'default', label: 'Use Category Default' },
  { value: 'all', label: 'All Messages' },
  { value: 'mentions', label: 'Only @mentions' },
  { value: 'nothing', label: 'Nothing' },
];

export function ChannelNotificationMenu({ channelId, categoryId, serverId }: ChannelNotificationMenuProps) {
  const muteChannel = useMuteChannel();
  const muteCategory = useMuteCategory();
  const setChannelNotification = useSetChannelNotification();
  const setCategoryNotification = useSetCategoryNotification();
  const { data: settings = [] } = useUserChannelSettings(serverId);

  const isChannel = !!channelId;
  const targetId = channelId || categoryId;

  // Get current settings
  const currentSetting = settings.find(s => 
    isChannel ? s.channel_id === targetId : s.category_id === targetId
  );
  
  const isMuted = currentSetting?.muted && (
    !currentSetting.mute_until || new Date(currentSetting.mute_until) > new Date()
  );
  
  const currentNotificationSetting: NotificationSetting = currentSetting?.notification_setting || 'default';

  const handleMute = (duration: MuteDuration) => {
    if (isChannel && channelId) {
      muteChannel.mutate({ channelId, duration });
    } else if (categoryId) {
      muteCategory.mutate({ categoryId, duration });
    }
  };

  const handleUnmute = () => {
    if (isChannel && channelId) {
      muteChannel.mutate({ channelId, duration: null });
    } else if (categoryId) {
      muteCategory.mutate({ categoryId, duration: null });
    }
  };

  const handleNotificationChange = (setting: NotificationSetting) => {
    if (isChannel && channelId) {
      setChannelNotification.mutate({ channelId, setting });
    } else if (categoryId) {
      setCategoryNotification.mutate({ categoryId, setting });
    }
  };

  return (
    <>
      {/* Mute Submenu */}
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <BellOff className="w-4 h-4 mr-2" />
          Mute {isChannel ? 'Channel' : 'Category'}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-56">
          {isMuted ? (
            <ContextMenuItem onClick={handleUnmute}>
              <Bell className="w-4 h-4 mr-2" />
              Unmute
            </ContextMenuItem>
          ) : (
            MUTE_DURATIONS.map((duration) => (
              <ContextMenuItem 
                key={duration.value} 
                onClick={() => handleMute(duration.value)}
              >
                <Clock className="w-4 h-4 mr-2" />
                {duration.label}
              </ContextMenuItem>
            ))
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>

      {/* Notification Settings Submenu */}
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Bell className="w-4 h-4 mr-2" />
          Notification Settings
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-56">
          <ContextMenuRadioGroup value={currentNotificationSetting}>
            {NOTIFICATION_SETTINGS.map((setting) => (
              <ContextMenuRadioItem
                key={setting.value}
                value={setting.value}
                onClick={() => handleNotificationChange(setting.value)}
                className="flex items-center gap-2"
              >
                {setting.label}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </>
  );
}
