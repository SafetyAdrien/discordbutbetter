import { cn } from '@/lib/utils';
import { DISCORD_ICON_SIZE_PX, hasSizeClass, resolveIconSize } from '@/lib/icon-config';
import {
  diAnnouncement,
  diAnnouncementLocked,
  diAnnouncementNsfw,
  diBoostOutline,
  diBrowseChannels,
  diCalendar,
  diForum,
  diForumLocked,
  diForumNsfw,
  diGuide,
  diHierarchy,
  diHome,
  diId,
  diLock,
  diMedia,
  diMediaLocked,
  diMediaNsfw,
  diPeople,
  diStage,
  diStageLocked,
  diTasks,
  diText,
  diTextLocked,
  diTextNsfw,
  diThreads,
  diVoice,
  diVoiceLocked,
  diVoiceNsfw,
} from './discord/discordIconData';

/*
 * Icones des types de salon et des raccourcis de la liste des salons
 * (section "Channel Icons" de la planche Discord 2026) : texte, vocal,
 * annonce, forum, multimedia, conference et leurs variantes verrouillee /
 * NSFW, salon des regles, guide, evenements, recherche de salons, membres,
 * boosts, cadenas, arborescence, identifiant.
 *
 * Le viewBox est serre sur le trace : `size` = taille visible du glyphe.
 * Discord affiche ces icones avec 20px d'encre dans la liste des salons
 * (mesure sur les videos de reference), d'ou la taille par defaut. Les
 * variantes "actives" gardent le dessin : la couleur vient de l'appelant.
 */

const SHEET = {
  guide: { data: diGuide, vb: '194.70 1787.04 26.80 26.80' },
  home: { data: diHome, vb: '130.10 1786.24 27.80 27.80' },
  calendar: { data: diCalendar, vb: '321.95 1785.74 28.10 28.10' },
  browseChannels: { data: diBrowseChannels, vb: '386.60 1787.74 29.40 29.40' },
  tasks: { data: diTasks, vb: '706.60 1787.04 26.80 26.80' },
  rules: { data: diTasks, vb: '706.60 1787.04 26.80 26.80' },
  announcement: { data: diAnnouncement, vb: '322.60 1914.59 26.80 26.80' },
  announcementThread: { data: diAnnouncement, vb: '322.60 1914.59 26.80 26.80' },
  announcementLocked: { data: diAnnouncementLocked, vb: '450.50 1913.04 28.30 28.30' },
  announcementThreadLocked: { data: diAnnouncementLocked, vb: '450.50 1913.04 28.30 28.30' },
  announcementNsfw: { data: diAnnouncementNsfw, vb: '578.60 1913.14 29.40 29.40' },
  announcementThreadNsfw: { data: diAnnouncementNsfw, vb: '578.60 1913.14 29.40 29.40' },
  stage: { data: diStage, vb: '705.30 1913.74 29.40 29.40' },
  stageLive: { data: diStage, vb: '705.30 1913.74 29.40 29.40' },
  stageLocked: { data: diStageLocked, vb: '768.30 1912.44 32.00 32.00' },
  stageLiveLocked: { data: diStageLocked, vb: '768.30 1912.44 32.00 32.00' },
  text: { data: diText, vb: '832.00 1784.44 32.00 32.00' },
  textThread: { data: diThreads, vb: '193.00 1297.44 30.00 30.00' },
  textLocked: { data: diTextLocked, vb: '960.00 1784.44 32.00 32.00' },
  textThreadLocked: { data: diTextLocked, vb: '960.00 1784.44 32.00 32.00' },
  textNsfw: { data: diTextNsfw, vb: '130.60 1849.14 29.40 29.40' },
  textThreadNsfw: { data: diTextNsfw, vb: '130.60 1849.14 29.40 29.40' },
  forum: { data: diForum, vb: '447.85 1848.44 32.00 32.00' },
  forumLocked: { data: diForumLocked, vb: '575.70 1848.44 32.00 32.00' },
  forumNsfw: { data: diForumNsfw, vb: '705.90 1849.44 30.10 30.10' },
  media: { data: diMedia, vb: '834.60 1850.59 26.80 26.80' },
  mediaLocked: { data: diMediaLocked, vb: '961.95 1850.64 29.40 29.40' },
  mediaNsfw: { data: diMediaNsfw, vb: '130.60 1914.39 29.40 29.40' },
  voice: { data: diVoice, vb: '258.60 1851.04 26.80 26.80' },
  voiceActive: { data: diVoice, vb: '258.60 1851.04 26.80 26.80' },
  voiceLocked: { data: diVoiceLocked, vb: '322.45 1849.44 28.40 28.40' },
  voiceLockedActive: { data: diVoiceLocked, vb: '322.45 1849.44 28.40 28.40' },
  voiceNsfw: { data: diVoiceNsfw, vb: '386.60 1849.14 29.40 29.40' },
  voiceNsfwActive: { data: diVoiceNsfw, vb: '386.60 1849.14 29.40 29.40' },
  members: { data: diPeople, vb: '578.60 1787.04 26.80 26.80' },
  boost: { data: diBoostOutline, vb: '63.63 2208.44 32.00 32.00' },
  lock: { data: diLock, vb: '833.30 1913.74 29.40 29.40' },
  lockActive: { data: diLock, vb: '833.30 1913.74 29.40 29.40' },
  hierarchy: { data: diHierarchy, vb: '450.60 5090.59 26.80 26.80' },
  id: { data: diId, vb: '642.60 1490.59 26.80 26.80' },
};

export type ChannelSheetIconName = keyof typeof SHEET;

export interface ChannelSheetIconProps {
  name: ChannelSheetIconName;
  className?: string;
  size?: number | string;
}

export function ChannelSheetIcon({ name, className, size }: ChannelSheetIconProps) {
  const icon = SHEET[name];
  const resolvedSize = resolveIconSize(size ?? DISCORD_ICON_SIZE_PX);
  // Classe de taille de l'appelant prioritaire, sauf prop `size` explicite.
  const classSized = size === undefined && hasSizeClass(className);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={resolvedSize}
      height={resolvedSize}
      viewBox={icon.vb}
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
      style={classSized ? undefined : { width: resolvedSize, height: resolvedSize }}
      dangerouslySetInnerHTML={{ __html: icon.data.body }}
    />
  );
}
