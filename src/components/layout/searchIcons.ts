/** Icones partagees par la barre de recherche, son menu et la fenetre "Filtres". */
import { BarChart3, File as FileIcon, Forward, LayoutTemplate } from 'lucide-react';
import { Bot, Image as ImageIcon, Link2, Music, Sticker, User as UserIcon, Video, Webhook } from '@/components/icons/discord/lucide';
import type { SearchAuthor, SearchHas } from '@/lib/searchQuery';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { StreamlineLink } from '@/components/icons/StreamlineLink';

export const channelTypeIcon: Record<string, React.ElementType> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  stage: StreamlineStage,
  link: StreamlineLink,
};

export const HAS_ICONS: Record<SearchHas, React.ElementType> = {
  image: ImageIcon,
  video: Video,
  link: Link2,
  file: FileIcon,
  embed: LayoutTemplate,
  sound: Music,
  poll: BarChart3,
  sticker: Sticker,
  forward: Forward,
};

export const AUTHOR_ICONS: Record<SearchAuthor, React.ElementType> = { user: UserIcon, bot: Bot, webhook: Webhook };
