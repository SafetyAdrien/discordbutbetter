/** Ouvre le panneau "Nouveau fil" (liste des fils > Creer, menu d'un message > Creer un fil). */
export const OPEN_NEW_THREAD_EVENT = 'app:open-new-thread';
export const NEW_THREAD_ID = 'new';

export function openNewThread(channelId: string, messageId?: string | null) {
  window.dispatchEvent(new CustomEvent(OPEN_NEW_THREAD_EVENT, { detail: { channelId, messageId: messageId ?? null } }));
}

/** Revient au salon et fait defiler jusqu'au message ("Y aller" sur le message d'origine d'un fil). */
export const JUMP_TO_MESSAGE_EVENT = 'app:jump-to-message';

export function jumpToChannelMessage(channelId: string, messageId: string) {
  window.dispatchEvent(new CustomEvent(JUMP_TO_MESSAGE_EVENT, { detail: { channelId, messageId } }));
}
