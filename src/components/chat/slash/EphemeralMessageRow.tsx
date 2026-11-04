import { Eye } from '@/components/icons/discord/lucide';
import { Check } from '@/components/icons/discord/lucide';
import { dismissEphemeralMessage, type EphemeralMessage } from '@/lib/ephemeralMessages';
import { ClydeAvatar } from './SlashIcons';

/*
 * Message ephemere de Clyde (video de reference) : fond teinte bleu avec
 * liseré gauche, badge APP, texte, puis "Toi seul(e) peux voir celui-ci —
 * Rejeter le message".
 */
export function EphemeralMessageRow({ message, time, onAuthorClick }: { message: EphemeralMessage; time: string; onAuthorClick?: (rect: DOMRect) => void }) {
  return (
    <div className="relative my-1 flex gap-4 bg-[#5865f2]/10 py-0.5 pl-4 pr-4 shadow-[inset_2px_0_0_0_#5865f2]" data-ephemeral-id={message.id}>
      <button
        type="button"
        aria-label="Clyde"
        onClick={(e) => onAuthorClick?.(e.currentTarget.getBoundingClientRect())}
        className="mt-0.5 h-10 w-10 shrink-0 rounded-full"
      >
        <ClydeAvatar className="h-10 w-10" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 leading-[22px]">
          <button type="button" onClick={(e) => onAuthorClick?.(e.currentTarget.getBoundingClientRect())} className="text-[16px] font-medium text-white hover:underline">
            Clyde
          </button>
          <span className="inline-flex h-[15px] items-center gap-0.5 rounded-[3px] bg-[#5865f2] px-1 text-[10px] font-semibold uppercase leading-none text-white">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
            APP
          </span>
          <span className="text-[12px] text-[#949ba4]">{time}</span>
        </p>
        <p className="text-[16px] leading-[22px] text-[#dbdee1]">
          {message.content.split('**').map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-white">{part}</strong> : part))}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] leading-4 text-[#949ba4]">
          <Eye className="h-3.5 w-3.5" />
          <span>Toi seul(e) peux voir celui-ci —</span>
          <button type="button" onClick={() => dismissEphemeralMessage(message.id)} className="text-[hsl(var(--text-link))] hover:underline">
            Rejeter le message
          </button>
        </p>
      </div>
    </div>
  );
}
