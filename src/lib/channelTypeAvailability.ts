import type { ChannelType } from '@/hooks/useChannels';

/*
 * Types de salon proposes selon le mode du serveur : un serveur classique
 * (fraichement cree) n'a que Texte, Vocal, Forum et Lien ; le mode
 * communaute debloque Annonce, Conference, Multimedia, Calendrier et Taches.
 */
export const BASIC_CHANNEL_TYPES: readonly ChannelType[] = ['text', 'voice', 'forum', 'link'];

export function isChannelTypeAvailable(type: ChannelType, community: boolean): boolean {
  return community || BASIC_CHANNEL_TYPES.includes(type);
}
