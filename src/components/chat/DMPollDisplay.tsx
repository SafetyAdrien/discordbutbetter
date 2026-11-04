import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DMPoll, DMPollVote, useVoteDMPoll, useRemoveDMVote, useEndDMPoll, closeDMPollAndNotify } from '@/hooks/useDMPolls';
import { useAuth } from '@/contexts/AuthContext';
import { isPast } from '@/lib/dateUtils';
import { Check } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipPortal } from '@/components/ui/tooltip';
import { ClosePollConfirmDialog } from './ClosePollConfirmDialog';
import { PollVotersModal } from './PollVotersModal';
import { computePollWinner } from '@/lib/pollWinner';

function VoterAvatars({ votes, onOpenVoters }: { votes: DMPollVote[]; onOpenVoters?: () => void }) {
  const maxVisible = 3;
  const visibleVotes = votes.slice(0, maxVisible);
  const remainingCount = votes.length - maxVisible;
  if (votes.length === 0) return null;
  return (
    <div className="flex items-center -space-x-1.5 transition-all duration-300 ease-out" onClick={(e) => { e.stopPropagation(); onOpenVoters?.(); }}>
      {visibleVotes.map((vote, index) => (
        <Tooltip key={vote.id}>
          <TooltipTrigger asChild>
            <Avatar
              className="w-5 h-5 border-2 border-card transition-transform duration-300 cursor-pointer animate-vote-pop hover:scale-110"
              style={{ zIndex: maxVisible - index, animationDelay: `${index * 50}ms` }}
            >
              <AvatarImage src={vote.user?.avatar_url || undefined} />
              <AvatarFallback className="text-[8px] bg-muted">{vote.user?.display_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top" sideOffset={20} className="text-xs">
              {vote.user?.display_name || 'Utilisateur inconnu'}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-5 h-5 rounded-full bg-primary border-2 border-card flex items-center justify-center text-[9px] font-medium text-primary-foreground cursor-pointer">
              +{remainingCount}
            </div>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top" sideOffset={20} className="text-xs max-w-[200px]">
              {votes.slice(maxVisible).map((v) => v.user?.display_name || 'Inconnu').join(', ')}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      )}
    </div>
  );
}

interface DMPollDisplayProps {
  poll: DMPoll;
  conversationId: string;
}

export function DMPollDisplay({ poll, conversationId }: DMPollDisplayProps) {
  const { user } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [votersModalOpen, setVotersModalOpen] = useState(false);
  const [votersModalOptionId, setVotersModalOptionId] = useState<string | undefined>(undefined);
  const votePoll = useVoteDMPoll();
  const removeVote = useRemoveDMVote();
  const endPoll = useEndDMPoll();

  const userVotes = useMemo(
    () => poll.votes.filter((v) => v.user_id === user?.id).map((v) => v.option_id),
    [poll.votes, user?.id],
  );
  const hasVoted = userVotes.length > 0;
  const totalVotes = poll.votes.length;
  const isExpired = poll.expires_at ? isPast(new Date(poll.expires_at)) : false;
  const canVote = !isExpired;

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const expiryNotifiedRef = useRef(false);
  useEffect(() => {
    if (!poll.expires_at || isExpired) { setTimeLeft(null); return; }
    const update = () => {
      const diff = new Date(poll.expires_at!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        if (!poll.closed_notified && !expiryNotifiedRef.current) {
          expiryNotifiedRef.current = true;
          closeDMPollAndNotify(poll.id, false).catch(() => {});
        }
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [poll.expires_at, isExpired, poll.id, poll.closed_notified]);

  const progressPercentage = useMemo(() => {
    if (!poll.expires_at || !poll.created_at) return 0;
    const start = new Date(poll.created_at).getTime();
    const end = new Date(poll.expires_at).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [poll.created_at, poll.expires_at, timeLeft]);

  const formatTimeLeft = () => {
    if (!timeLeft) return null;
    const { days, hours, minutes, seconds } = timeLeft;
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const voteCountByOption = useMemo(() => {
    const c: Record<string, number> = {};
    poll.options.forEach((o) => (c[o.id] = 0));
    poll.votes.forEach((v) => { if (c[v.option_id] !== undefined) c[v.option_id]++; });
    return c;
  }, [poll.votes, poll.options]);

  const votesByOption = useMemo(() => {
    const m: Record<string, DMPollVote[]> = {};
    poll.options.forEach((o) => (m[o.id] = poll.votes.filter((v) => v.option_id === o.id)));
    return m;
  }, [poll.votes, poll.options]);

  const winnerOptionId = useMemo(() => {
    if (!isExpired) return null;
    return computePollWinner({ options: poll.options, votes: poll.votes }).winnerOptionId;
  }, [isExpired, poll.options, poll.votes]);

  const shouldShowResults = (showResults || hasVoted || isExpired) && !isEditing;

  const handleOptionClick = (optionId: string) => {
    if (!canVote) return;
    if (isEditing) {
      if (poll.allow_multiple) {
        setSelectedOptions((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
      } else {
        setSelectedOptions((prev) => (prev.includes(optionId) ? [] : [optionId]));
      }
      return;
    }
    if (hasVoted || showResults) return;
    if (poll.allow_multiple) {
      setSelectedOptions((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
    } else {
      setSelectedOptions((prev) => (prev.includes(optionId) ? [] : [optionId]));
    }
  };

  const handleVote = () => {
    if (isEditing) {
      const toAdd = selectedOptions.filter((id) => !userVotes.includes(id));
      const toRemove = userVotes.filter((id) => !selectedOptions.includes(id));
      toRemove.forEach((optionId) => removeVote.mutate({ pollId: poll.id, optionId, conversationId }));
      toAdd.forEach((optionId) => votePoll.mutate({ pollId: poll.id, optionId, conversationId }));
      setSelectedOptions([]);
      setIsEditing(false);
      return;
    }
    selectedOptions.forEach((optionId) => votePoll.mutate({ pollId: poll.id, optionId, conversationId }));
    setSelectedOptions([]);
  };

  const handleStartEdit = () => { setSelectedOptions([...userVotes]); setIsEditing(true); };
  const handleCancelEdit = () => { setIsEditing(false); setSelectedOptions([]); };
  const handleRemoveVote = () => {
    userVotes.forEach((optionId) => removeVote.mutate({ pollId: poll.id, optionId, conversationId }));
  };
  const getPercentage = (id: string) => (totalVotes === 0 ? 0 : Math.round((voteCountByOption[id] / totalVotes) * 100));

  return (
    <div className="bg-[#383840] border border-[#43434b] rounded-lg overflow-hidden w-full max-w-[472px]">
      <div className="px-4 pb-4 space-y-3">
        <p translate="no" className="text-foreground font-medium text-base my-3">{poll.question}</p>

        {!hasVoted && canVote && !showResults && (
          <p className="text-muted-foreground py-0 text-xs font-thin">
            {poll.allow_multiple ? 'Sélectionnez une ou plusieurs réponses' : 'Sélectionnez une réponse'}
          </p>
        )}

        <div className="space-y-2">
          {poll.options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const isVoted = userVotes.includes(option.id);
            const percentage = getPercentage(option.id);
            const voteCount = voteCountByOption[option.id];
            const optionVotes = votesByOption[option.id];
            const isWinningOption = winnerOptionId === option.id;

            const optionDisabled = isEditing ? false : (!canVote && !hasVoted) || (showResults && !hasVoted);

            return (
              <div
                key={option.id}
                role="button"
                tabIndex={optionDisabled ? -1 : 0}
                aria-disabled={optionDisabled}
                onClick={() => !optionDisabled && handleOptionClick(option.id)}
                onKeyDown={(e) => {
                  if (!optionDisabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleOptionClick(option.id);
                  }
                }}
                className={cn(
                  'w-full relative rounded-md border transition-all duration-300 text-left overflow-hidden',
                  optionDisabled ? 'cursor-default' : 'cursor-pointer',
                  isWinningOption
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isSelected || isVoted
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:bg-[#46464e] bg-[#404048]',
                )}
              >
                <div
                  className={cn(
                    'absolute inset-0 transition-all duration-500 delay-150 ease-out',
                    isWinningOption ? 'bg-emerald-500/20' : 'bg-primary/20',
                  )}
                  style={{ width: shouldShowResults ? `${percentage}%` : '0%' }}
                />
                <div className="relative flex items-center gap-3 px-3.5 py-3.5">
                  {option.emoji && <span className="text-lg flex-shrink-0">{option.emoji}</span>}
                  <span translate="no" className="flex-1 text-sm text-foreground">{option.text}</span>
                  <div className={cn('flex items-center gap-2 flex-shrink-0 transition-all duration-300', shouldShowResults ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2')}>
                    {shouldShowResults && (
                      <>
                        <VoterAvatars
                          votes={optionVotes}
                          onOpenVoters={() => {
                            setVotersModalOptionId(option.id);
                            setVotersModalOpen(true);
                          }}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVotersModalOptionId(option.id);
                                setVotersModalOpen(true);
                              }}
                              className={cn(
                                'text-xs whitespace-nowrap hover:underline',
                                isWinningOption ? 'text-emerald-500 font-semibold' : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {voteCount} vote{voteCount !== 1 ? 's' : ''} ({percentage}%)
                            </button>
                          </TooltipTrigger>
                          {optionVotes.length > 0 && (
                            <TooltipPortal>
                              <TooltipContent side="top" sideOffset={20} className="text-xs max-w-[200px]">
                                {optionVotes.map((v) => v.user?.display_name || 'Inconnu').join(', ')}
                              </TooltipContent>
                            </TooltipPortal>
                          )}
                        </Tooltip>
                        {isVoted && (
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center', isWinningOption ? 'bg-emerald-500' : 'bg-primary')}>
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className={cn('transition-all duration-300', shouldShowResults ? 'opacity-0 scale-75 w-0' : 'opacity-100 scale-100')}>
                    {!shouldShowResults && (
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50')}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap min-w-0">
            {totalVotes > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setVotersModalOptionId(undefined);
                  setVotersModalOpen(true);
                }}
                className="hover:underline hover:text-foreground"
              >
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
              </button>
            ) : (
              <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            )}
            {poll.expires_at && (
              <div className="flex items-center gap-2">
                {isExpired ? (
                  <span className="text-muted-foreground">Terminé</span>
                ) : (
                  <>
                    <div className="relative w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-1000', progressPercentage > 80 ? 'bg-destructive' : progressPercentage > 50 ? 'bg-yellow-500' : 'bg-primary')}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <span className={cn('font-mono text-xs tabular-nums', progressPercentage > 80 ? 'text-destructive' : 'text-muted-foreground')}>{formatTimeLeft()}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {!isExpired && hasVoted && !isEditing && canVote && (
              <Button variant="ghost" size="sm" onClick={handleStartEdit} className="text-xs h-8">Modifier</Button>
            )}
            {!isExpired && hasVoted && !isEditing && canVote && (
              <Button variant="ghost" size="sm" onClick={handleRemoveVote} disabled={removeVote.isPending} className="text-xs h-8">Supprimer le vote</Button>
            )}
            {!isExpired && poll.author_id === user?.id && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmCloseOpen(true)}
                disabled={endPoll.isPending}
                className="text-xs h-8 text-destructive hover:text-destructive"
              >
                Terminer
              </Button>
            )}
            {isEditing && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-xs h-8">Annuler</Button>
            )}
            {!shouldShowResults && !hasVoted && !isEditing && canVote && (
              <Button variant="ghost" size="sm" onClick={() => setShowResults(true)} className="text-xs h-8">Afficher les résultats</Button>
            )}
            {showResults && !hasVoted && !isEditing && canVote && (
              <Button variant="ghost" size="sm" onClick={() => setShowResults(false)} className="text-xs h-8">Revenir au vote</Button>
            )}
            {(!hasVoted || isEditing) && canVote && selectedOptions.length > 0 && (
              <Button onClick={handleVote} disabled={votePoll.isPending} size="sm" className="bg-primary hover:bg-primary/80 text-primary-foreground text-xs h-8">
                {isEditing ? 'Confirmer' : 'Voter'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ClosePollConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onConfirm={() => endPoll.mutate({ pollId: poll.id, conversationId })}
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
