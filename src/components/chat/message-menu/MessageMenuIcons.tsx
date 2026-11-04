import type { SVGProps } from 'react';
import { createDiscordIcon } from '@/components/icons/discord/createDiscordIcon';
import {
  diApps, diChevronRight, diClock, diCopy, diId, diLink, diPencil, diPin, diReply, diSmile, diTrash, diUnpin,
} from '@/components/icons/discord/discordIconData';

/*
 * Icones du menu d'un message et de sa barre de survol (planche de reference) :
 * glyphes pleins pour les actions, contours pour repondre / transferer / lien.
 */

export const IconSmile = createDiscordIcon(diSmile, 'IconSmile');
export const IconPencil = createDiscordIcon(diPencil, 'IconPencil');
export const IconReply = createDiscordIcon(diReply, 'IconReply');
// "Transferer" : la fleche de reponse retournee (↱), comme sur la planche de reference.
export const IconForward = createDiscordIcon(diReply, 'IconForward', { flip: true });
export const IconCopyText = createDiscordIcon(diCopy, 'IconCopyText');
export const IconPin = createDiscordIcon(diPin, 'IconPin');
export const IconUnpin = createDiscordIcon(diUnpin, 'IconUnpin');
export const IconClock = createDiscordIcon(diClock, 'IconClock');
export const IconApps = createDiscordIcon(diApps, 'IconApps');
export const IconLink = createDiscordIcon(diLink, 'IconLink');
export const IconTrash = createDiscordIcon(diTrash, 'IconTrash');
export const IconId = createDiscordIcon(diId, 'IconId');
export const IconChevronRight = createDiscordIcon(diChevronRight, 'IconChevronRight');

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, ...p });

/** Marque-page ("Marquer un message"). */
export function IconBookmark(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M7 4.75h10a1.25 1.25 0 0 1 1.25 1.25v13.1a.4.4 0 0 1-.64.32L12 15.3l-5.61 4.12a.4.4 0 0 1-.64-.32V6A1.25 1.25 0 0 1 7 4.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

const BUBBLE = 'M12 2.6c-5.2 0-9.4 3.6-9.4 8.2 0 2.4 1.2 4.6 3.1 6.1-.2 1.3-.8 2.5-1.8 3.4-.3.3-.1.8.3.8 1.9 0 3.6-.7 4.9-1.8.9.2 1.9.3 2.9.3 5.2 0 9.4-3.7 9.4-8.3S17.2 2.6 12 2.6Z';

/** Bulle avec fleche circulaire ("Marquer comme non lu"). */
export function IconMarkUnread(p: P) {
  return (
    <svg {...base(p)}>
      <defs>
        <mask id="mu-cut">
          <rect width="24" height="24" fill="#fff" />
          <circle cx="17.2" cy="17.2" r="6.3" fill="#000" />
        </mask>
      </defs>
      <path mask="url(#mu-cut)" fill="currentColor" d={BUBBLE} />
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14.3 14.2v2.6h2.6M14.3 16.8a3.5 3.5 0 1 1 .9 2.3" />
    </svg>
  );
}

/** Bulle avec haut-parleur decoupe ("Dicter le message"). */
export function IconDictate(p: P) {
  return (
    <svg {...base(p)}>
      <path fill="currentColor" fillRule="evenodd" d={`${BUBBLE} M9.1 9.6h1.6l2.5-2.1v8.1l-2.5-2.1H9.1a.7.7 0 0 1-.7-.7v-2.5a.7.7 0 0 1 .7-.7Zm5.3.4a2.9 2.9 0 0 1 0 4.1l-.8-.8a1.7 1.7 0 0 0 0-2.5l.8-.8Z`} />
    </svg>
  );
}

/** Galerie ("6 images" dans l'apercu du transfert). */
export function IconImages(p: P) {
  return (
    <svg {...base(p)}>
      <path fill="currentColor" d="M7.5 3.5h9A3 3 0 0 1 19.5 6.5v8a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v5.3l2.2-2.2a1.2 1.2 0 0 1 1.7 0l1.9 1.9 1.4-1.4a1.2 1.2 0 0 1 1.7 0l1.1 1.1V6.5a1 1 0 0 0-1-1h-9Z" />
      <path fill="currentColor" d="M4.5 18.7a3 3 0 0 0 3 2h8.6a4.5 4.5 0 0 1-4.5-4.4H7.5a3 3 0 0 1-3-3v5.4Z" opacity=".65" />
    </svg>
  );
}
