import { cn } from '@/lib/utils';
import type { DMCall } from '@/hooks/useDMCalls';
import { format, fr } from '@/lib/dateUtils';

/*
 * Ligne d'un appel dans la discussion (video de reference) : icone de telephone verte, "X a commence un appel. —
 * Rejoindre l'appel 10:46" tant que l'appel dure, puis "X a commence un appel qui a duree 2 minutes." ; rouge pour un appel
 * manque.
 */

function lasted(ms: number): string {
  const min = Math.round(ms / 60000);
  if (ms < 60000) return 'quelques secondes';
  if (min < 60) return `${min} minute${min > 1 ? 's' : ''}`;
  const h = Math.round(min / 60);
  return h === 1 ? 'une heure' : `${h} heures`;
}

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M17.7 13.3a1 1 0 00-1.2-.2l-2 1a12 12 0 01-4.8-4.8l1-2a1 1 0 00-.2-1.2L8.6 3.6a1 1 0 00-1.3-.1L4.8 5.3a2 2 0 00-.7 2 18 18 0 0012.4 12.4 2 2 0 002-.7l1.8-2.5a1 1 0 00-.1-1.3l-2.5-1.9z" />
  </svg>
);

interface Props {
  call: DMCall;
  meId: string | undefined;
  /** Nom a afficher pour l'initiateur (pseudo d'ami compris). */
  initiatorName: string;
  /** Je participe deja a cet appel. */
  joined: boolean;
  onJoin: () => void;
}

export function DMCallRow({ call, meId, initiatorName, joined, onJoin }: Props) {
  const live = call.status === 'ringing' || call.status === 'active';
  const time = format(new Date(call.created_at), 'HH:mm', { locale: fr });
  const mine = call.initiator_id === meId;
  const missed = !live && !call.started_at && !mine;
  const duration = call.ended_at && call.started_at ? new Date(call.ended_at).getTime() - new Date(call.started_at).getTime() : null;
  const name = <span translate="no" className="font-semibold text-white">{initiatorName}</span>;

  return (
    <div className="-mx-4 flex min-h-[44px] items-start px-4 py-1.5">
      <span className={cn('flex w-[56px] shrink-0 justify-center pt-[3px]', missed ? 'text-[#f23f43]' : 'text-[#23a55a]')}>
        <PhoneIcon className="h-5 w-5" />
      </span>
      <p className="min-w-0 flex-1 text-base leading-[22px] text-[#949ba4]">
        {missed ? (
          <>Tu as manqué un appel de {name}.</>
        ) : (
          <>
            {name} a commencé un appel{!live && duration !== null ? ` qui a duré ${lasted(duration)}` : ''}.
            {live && !joined && (
              <>
                {' — '}
                <button type="button" onClick={onJoin} className="text-[#00a8fc] hover:underline">Rejoindre l'appel</button>
              </>
            )}
          </>
        )}{' '}
        <span className="text-xs text-[#949ba4]">{time}</span>
      </p>
    </div>
  );
}
