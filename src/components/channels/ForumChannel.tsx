import { ForumView } from '@/components/channels/forum/ForumView';

interface Channel { id: string; name: string; type: string; description?: string; server_id?: string }

export interface ForumChannelProps {
  channel: Channel;
  serverId?: string;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  hideHeader?: boolean;
}

/** Salon Forum (Discord) : voir ForumView. */
export function ForumChannel({ channel, serverId, ...rest }: ForumChannelProps) {
  return <ForumView channel={channel} mode="forum" serverId={serverId ?? channel.server_id ?? ''} {...rest} />;
}
