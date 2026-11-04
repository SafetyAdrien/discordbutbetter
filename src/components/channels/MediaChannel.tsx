import { ForumView } from '@/components/channels/forum/ForumView';

interface Channel { id: string; name: string; type: string; description?: string; server_id?: string }

export interface MediaChannelProps {
  channel: Channel;
  serverId?: string;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  /** Masque l'en-tete quand un parent l'affiche deja. */
  hideHeader?: boolean;
}

/** Salon Multimedia (Discord) : un forum dont les posts portent des medias. Voir ForumView. */
export function MediaChannel({ channel, serverId, ...rest }: MediaChannelProps) {
  return <ForumView channel={channel} mode="media" serverId={serverId ?? channel.server_id ?? ''} {...rest} />;
}
