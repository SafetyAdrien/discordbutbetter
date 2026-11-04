import { AlignLeft } from '@/components/icons/discord/lucide';
import type { Poll } from '@/hooks/usePolls';
import { cn } from '@/lib/utils';

/*
 * "Le sondage « Question » de Auteur est clos." (video de reference) : message systeme poste a la cloture
 * (trigger close_poll_and_claim_notification), icone de liste a gauche, phrase, puis la carte du resultat
 * (pastille + "Il n'y a pas eu de vainqueur" ou reponse gagnante, bouton "Voir le sondage").
 * Barre jaune et fond ambre quand l'utilisateur est l'auteur du sondage, comme une mention.
 */

export type PollClosedResult =
  | { kind: 'winner'; text: string; emoji?: string | null; pct: number }
  | { kind: 'tie' }
  | { kind: 'none' };

function pollResult(poll: Poll): PollClosedResult {
  const total = poll.votes.length;
  const counts = new Map(poll.options.map((o) => [o.id, 0]));
  poll.votes.forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));
  const max = Math.max(0, ...counts.values());
  const winners = max > 0 ? poll.options.filter((o) => counts.get(o.id) === max) : [];
  if (winners.length === 1) return { kind: 'winner', text: winners[0].text, emoji: winners[0].emoji, pct: total ? Math.round((max / total) * 100) : 0 };
  return winners.length > 1 ? { kind: 'tie' } : { kind: 'none' };
}

/** Presentation seule (salons et messages prives partagent le meme rendu). */
export function PollClosedRow({
  question, authorName, timeLabel, mentionsMe, result, onOpen, onAuthorClick,
}: {
  question: string;
  authorName: string;
  timeLabel: string;
  mentionsMe?: boolean;
  result: PollClosedResult | null;
  onOpen?: () => void;
  onAuthorClick?: () => void;
}) {
  return (
    <div className={cn('-mx-4 flex gap-4 px-4 py-1 message-hover', mentionsMe && 'message-mentioned')}>
      <span className="w-10 shrink-0 flex justify-center pt-1"><AlignLeft className="w-5 h-5 text-muted-foreground" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-base leading-[22px] text-muted-foreground">
          Le sondage «&nbsp;
          <button type="button" onClick={onOpen} className="font-semibold text-foreground hover:underline">{question}</button>
          &nbsp;» de{' '}
          <button type="button" onClick={onAuthorClick} className="font-semibold text-foreground hover:underline">{authorName}</button>
          {' '}est clos.
          <span className="ml-2 text-xs">{timeLabel}</span>
        </p>
        {result && (
          <div className="mt-1 w-[402px] max-w-full flex items-center gap-2 p-1.5 rounded-lg bg-[#383840] border border-[#43434b]">
            <span className="w-10 h-10 rounded-lg bg-[#42424a] flex items-center justify-center shrink-0 text-2xl leading-none" aria-hidden>
              {result.kind === 'winner' ? result.emoji || '🏆' : '😵'}
            </span>
            <div className="flex-1 min-w-0">
              {result.kind === 'winner' ? (
                <>
                  <p translate="no" className="text-sm font-semibold leading-[18px] text-white truncate">{result.text}</p>
                  <p className="text-xs leading-4 text-muted-foreground">Réponse gagnante · {result.pct}%</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-white truncate">{result.kind === 'tie' ? 'Il y a eu une égalité' : "Il n'y a pas eu de vainqueur"}</p>
              )}
            </div>
            <button type="button" onClick={onOpen} className="h-8 px-3 mr-1 rounded-md bg-[#43434b] hover:bg-[#4c4c54] text-sm font-medium text-white shrink-0 transition-colors">
              Voir le sondage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PollClosedSystemMessage({ poll, timeLabel, mentionsMe, onAuthorClick }: { poll: Poll | null; timeLabel: string; mentionsMe?: boolean; onAuthorClick?: () => void }) {
  const openPoll = () => {
    if (!poll) return;
    const el = document.querySelector(`[data-poll-id="${poll.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('highlight-flash');
    setTimeout(() => el?.classList.remove('highlight-flash'), 2000);
  };
  return (
    <PollClosedRow
      question={poll?.question ?? 'supprimé'}
      authorName={poll?.author?.display_name ?? 'un membre'}
      timeLabel={timeLabel}
      mentionsMe={mentionsMe}
      result={poll ? pollResult(poll) : null}
      onOpen={openPoll}
      onAuthorClick={onAuthorClick}
    />
  );
}
