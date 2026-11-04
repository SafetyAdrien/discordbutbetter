import type { ReactNode } from 'react';
import { ChevronRight } from '@/components/icons/discord/lucide';
import { IconForward } from './message-menu/MessageMenuIcons';
import type { ForwardedFrom } from '@/lib/forwardMessage';

/*
 * Message transfere (video de reference) : filet gris a gauche, "↪ Transféré" en italique, le contenu copie,
 * puis le pied "#salon • 11:34 ›" qui renvoie vers le message d'origine.
 */

const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');

function originLabel(from: ForwardedFrom): string {
  if (from.kind === 'dm') return 'Message privé';
  if (from.kind === 'thread') return from.threadName ? `${from.threadName}` : 'Fil';
  return from.channelName ? `#${from.channelName}` : '#salon';
}

export function ForwardedFrame({ from, onJump, children }: { from?: ForwardedFrom | null; onJump?: (from: ForwardedFrom) => void; children: ReactNode }) {
  if (!from) return <>{children}</>;
  const label = originLabel(from);
  const footer = (
    <>
      <span translate="no" className="truncate">{label}</span>
      <span aria-hidden>•</span>
      <span>{hhmm(from.createdAt)}</span>
      {onJump && <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden />}
    </>
  );
  return (
    <div className="ml-1 mt-0.5 pl-3 border-l-2 border-[#4e4e57]">
      <div className="flex items-center gap-1.5 text-sm italic leading-5 text-[#b5bac1]">
        <IconForward className="w-4 h-4 shrink-0" />
        Transféré
      </div>
      {children}
      {onJump ? (
        <button type="button" onClick={() => onJump(from)} className="mt-1 flex items-center gap-1.5 max-w-full text-[13px] leading-[18px] font-medium text-[#b5bac1] hover:text-white hover:underline">
          {footer}
        </button>
      ) : (
        <div className="mt-1 flex items-center gap-1.5 max-w-full text-[13px] leading-[18px] font-medium text-[#b5bac1]">{footer}</div>
      )}
    </div>
  );
}
