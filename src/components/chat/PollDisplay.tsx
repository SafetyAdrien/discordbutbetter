import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Poll, PollVote, useVotePoll, useRemoveVote, useEndPoll, closePollAndNotify } from '@/hooks/usePolls';
import { useAuth } from '@/contexts/AuthContext';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { isPast } from '@/lib/dateUtils';
import { Check, Lock } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { ClosePollConfirmDialog } from './ClosePollConfirmDialog';
import { PollVotersModal } from './PollVotersModal';

interface PollDisplayProps {
  poll: Poll;
  channelId: string;
  threadId?: string | null;
}

export function PollDisplay({
  poll,
  channelId,
  threadId
}: PollDisplayProps) {
  const { user } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [votersModalOpen, setVotersModalOpen] = useState(false);
  const [votersModalOptionId, setVotersModalOptionId] = useState<string | undefined>(undefined);
  const votePoll = useVotePoll();
  const removeVote = useRemoveVote();
  const endPoll = useEndPoll();

  // Check vote permission
  const { data: canVoteInPolls = true } = useHasChannelPermission(channelId, 'vote_in_polls');

  const userVotes = useMemo(() => 
    poll.votes.filter(v => v.user_id === user?.id).map(v => v.option_id), 
    [poll.votes, user?.id]
  );
  const hasVoted = userVotes.length > 0;
  const totalVotes = poll.votes.length;
  const isExpired = poll.expires_at ? isPast(new Date(poll.expires_at)) : false;
  const canVote = canVoteInPolls && !isExpired;

  // Real-time countdown state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const expiryNotifiedRef = useRef(false);

  useEffect(() => {
    if (!poll.expires_at || isExpired) {
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(poll.expires_at!);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        // First client whose countdown hits 0 claims the "poll closed"
        // system message insert; idempotent server-side, safe if several
        // clients race here or if the poll was already closed manually.
        if (!poll.closed_notified && !expiryNotifiedRef.current) {
          expiryNotifiedRef.current = true;
          closePollAndNotify(poll.id, false).catch(() => {});
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [poll.expires_at, isExpired, poll.id, poll.closed_notified]);

  const voteCountByOption = useMemo(() => {
    const counts: Record<string, number> = {};
    poll.options.forEach(opt => {
      counts[opt.id] = 0;
    });
    poll.votes.forEach(vote => {
      if (counts[vote.option_id] !== undefined) {
        counts[vote.option_id]++;
      }
    });
    return counts;
  }, [poll.votes, poll.options]);

  const votesByOption = useMemo(() => {
    const map: Record<string, PollVote[]> = {};
    poll.options.forEach(opt => {
      map[opt.id] = poll.votes.filter(v => v.option_id === opt.id);
    });
    return map;
  }, [poll.votes, poll.options]);

  const shouldShowResults = showResults || hasVoted || isExpired;

  // Comme Discord : on choisit, puis "Voter". Pour changer d'avis, "Supprimer le vote".
  const handleOptionClick = (optionId: string) => {
    if (!canVote || hasVoted || showResults) return;
    if (poll.allow_multiple) {
      setSelectedOptions((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
    } else {
      setSelectedOptions((prev) => (prev.includes(optionId) ? [] : [optionId]));
    }
  };

  const handleVote = () => {
    selectedOptions.forEach((optionId) => votePoll.mutate({ pollId: poll.id, optionId, channelId, threadId }));
    setSelectedOptions([]);
  };

  const handleRemoveVote = () => {
    userVotes.forEach(optionId => {
      removeVote.mutate({ pollId: poll.id, optionId, channelId, threadId });
    });
  };

  const getPercentage = (optionId: string) => {
    if (totalVotes === 0) return 0;
    return Math.round(voteCountByOption[optionId] / totalVotes * 100);
  };

  // Comme Discord : une fois clos, toutes les reponses a egalite en tete sont en vert.
  const maxVotes = Math.max(0, ...Object.values(voteCountByOption));
  const isWinner = (optionId: string) => isExpired && maxVotes > 0 && voteCountByOption[optionId] === maxVotes;
  const remainingLabel = (() => {
    if (!timeLeft) return null;
    const { days, hours, minutes } = timeLeft;
    if (days > 0) return `${days} j restant${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} h restante${hours > 1 ? 's' : ''}`;
    return `${Math.max(1, minutes)} min restante${minutes > 1 ? 's' : ''}`;
  })();

  return (
    <div className="w-full max-w-[472px] rounded-lg bg-[#383840] border border-[#43434b] px-4 pt-3.5 pb-4">
      <p translate="no" className="text-base font-medium text-white break-words">{poll.question}</p>
      {!isExpired && !shouldShowResults && (
        <p className="text-sm text-muted-foreground">
          {canVote ? (poll.allow_multiple ? 'Sélectionne une ou plusieurs réponses' : 'Sélectionne une réponse') : (
            <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Tu n'as pas la permission de voter</span>
          )}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {poll.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const isVoted = userVotes.includes(option.id);
          const percentage = getPercentage(option.id);
          const voteCount = voteCountByOption[option.id];
          const winner = isWinner(option.id);
          const optionDisabled = shouldShowResults || !canVote;
          const highlighted = shouldShowResults ? (winner || (!isExpired && isVoted)) : isSelected;

          return (
            <div
              key={option.id}
              role={optionDisabled ? undefined : poll.allow_multiple ? 'checkbox' : 'radio'}
              aria-checked={optionDisabled ? undefined : isSelected}
              tabIndex={optionDisabled ? -1 : 0}
              onClick={() => !optionDisabled && handleOptionClick(option.id)}
              onKeyDown={(e) => {
                if (!optionDisabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleOptionClick(option.id);
                }
              }}
              className={cn(
                'relative min-h-12 rounded-lg border overflow-hidden transition-colors bg-[#404048]',
                optionDisabled ? 'cursor-default' : 'cursor-pointer hover:bg-[hsl(var(--interactive-background-hover))]',
                highlighted ? (winner ? 'border-[hsl(var(--online))]' : 'border-primary') : 'border-transparent',
              )}
            >
              {shouldShowResults && (
                <div
                  className={cn('absolute inset-y-0 left-0 transition-[width] duration-500 ease-out', winner ? 'bg-[hsl(var(--online))]/25' : 'bg-primary/25')}
                  style={{ width: `${percentage}%` }}
                />
              )}
              <div className="relative flex items-center gap-3 px-4 py-2.5 min-h-12">
                {option.emoji && <span className="text-2xl leading-none shrink-0">{option.emoji}</span>}
                <span translate="no" className="flex-1 min-w-0 text-sm font-semibold text-white break-words">{option.text}</span>
                {shouldShowResults ? (
                  <span className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVotersModalOptionId(option.id);
                        setVotersModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-white hover:underline"
                    >
                      {voteCount} vote{voteCount > 1 ? 's' : ''}
                    </button>
                    <span className="w-10 text-right text-[15px] font-bold text-white">{percentage}%</span>
                    {(isVoted || winner) && (
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center', winner ? 'bg-[hsl(var(--online))]' : 'bg-primary')}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                      </span>
                    )}
                  </span>
                ) : poll.allow_multiple ? (
                  <span className={cn('w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0', isSelected ? 'bg-primary border-primary' : 'border-[hsl(var(--header-icon))]')}>
                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </span>
                ) : (
                  <span className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0', isSelected ? 'border-primary bg-white' : 'border-[hsl(var(--header-icon))]')}>
                    {isSelected && <span className="w-3 h-3 rounded-full bg-primary" />}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 min-h-10 flex items-center gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          <button
            type="button"
            disabled={totalVotes === 0}
            onClick={() => {
              setVotersModalOptionId(undefined);
              setVotersModalOpen(true);
            }}
            className="font-medium text-foreground enabled:hover:underline"
          >
            {totalVotes} vote{totalVotes > 1 ? 's' : ''}
          </button>
          {poll.expires_at && (
            <>
              <span className="mx-1.5">·</span>
              {isExpired ? 'Sondage terminé' : remainingLabel}
            </>
          )}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {!isExpired && hasVoted && canVote && (
            <Button variant="secondary" size="sm" className="h-8" onClick={handleRemoveVote} disabled={removeVote.isPending}>
              Supprimer le vote
            </Button>
          )}
          {!isExpired && !hasVoted && canVote && !showResults && (
            <>
              <button type="button" onClick={() => setShowResults(true)} className="h-8 px-2 text-sm font-medium text-white hover:underline">
                Afficher les résultats
              </button>
              <Button size="sm" className="h-8 px-4" onClick={handleVote} disabled={selectedOptions.length === 0 || votePoll.isPending}>
                Voter
              </Button>
            </>
          )}
          {!isExpired && !hasVoted && canVote && showResults && (
            <button type="button" onClick={() => setShowResults(false)} className="h-8 px-2 text-sm font-medium text-white hover:underline">
              Revenir au vote
            </button>
          )}
        </div>
      </div>

      <ClosePollConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onConfirm={() => endPoll.mutate({ pollId: poll.id, channelId, threadId })}
      />
      <PollVotersModal
        open={votersModalOpen}
        onOpenChange={setVotersModalOpen}
        question={poll.question}
        totalVotes={totalVotes}
        options={poll.options}
        votesByOption={votesByOption}
        initialOptionId={votersModalOptionId}
      />
    </div>
  );
}
