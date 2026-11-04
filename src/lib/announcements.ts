/** Salons d'annonces et messages systeme associes (voir AnnouncementBits). */

export interface PublishedSource {
  sourceChannelId?: string | null;
  serverId?: string | null;
  serverName: string;
  channelName?: string | null;
  serverIcon?: string | null;
}

/** Auteur affiche d'un message publie : nom de l'annonce, ou "<serveur> #<salon>". */
export function publishedAuthorName(src: PublishedSource) {
  return src.channelName ? `${src.serverName} #${src.channelName}` : src.serverName;
}

/** "X a ajoute <serveur> #<salon> dans ce salon" (trigger channel_followed_message). */
export const CHANNEL_FOLLOWED_RE = /^\[SYSTEM:CHANNEL_FOLLOWED:([^\]]+)\]$/;

/** "Le sondage ... est clos" (close_poll_and_claim_notification). */
export const POLL_CLOSED_RE = /^\[SYSTEM:POLL_CLOSED:([^\]]+)\]$/;
