import type { ChannelSheetIconName } from '@/components/icons/ChannelSheetIcon';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { StreamlineLink } from '@/components/icons/StreamlineLink';

export const channelIcons: Record<string, React.ElementType> = {
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


/**
 * Variante de la planche pour un salon : verrouillee (prive ou acces
 * refuse) et/ou active (vocal occupe, conference en direct). null = icone
 * de base du type (lien, calendrier, taches).
 */
export function channelSheetIconName(type: string, { locked = false, active = false }: { locked?: boolean; active?: boolean }): ChannelSheetIconName | null {
  switch (type) {
    case 'text':
      return locked ? 'textLocked' : 'text';
    case 'announcement':
      return locked ? 'announcementLocked' : 'announcement';
    case 'forum':
      return locked ? 'forumLocked' : 'forum';
    case 'media':
      return locked ? 'mediaLocked' : 'media';
    case 'voice':
      return locked ? (active ? 'voiceLockedActive' : 'voiceLocked') : active ? 'voiceActive' : 'voice';
    case 'stage':
      return locked ? (active ? 'stageLiveLocked' : 'stageLocked') : active ? 'stageLive' : 'stage';
    default:
      return null;
  }
}
