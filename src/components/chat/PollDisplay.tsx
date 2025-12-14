import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Poll, useVotePoll, useRemoveVote } from '@/hooks/usePolls';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollDisplayProps {
  poll: Poll;
  channelId: string;
  threadId?: string | null;
}

export function PollDisplay({ poll, channelId, threadId }: PollDisplayProps) {
  const { user } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  const votePoll = useVotePoll();
  const removeVote = useRemoveVote();

  const userVotes = useMemo(() => 
    poll.votes.filter(v => v.user_id === user?.id).map(v => v.option_id),
    [poll.votes, user?.id]
  );

  const hasVoted = userVotes.length > 0;
  const totalVotes = poll.votes.length;
  const isExpired = poll.expires_at ? isPast(new Date(poll.expires_at)) : false;

  const voteCountByOption = useMemo(() => {
    const counts: Record<string, number> = {};
    poll.options.forEach(opt => { counts[opt.id] = 0; });
    poll.votes.forEach(vote => {
      if (counts[vote.option_id] !== undefined) {
        counts[vote.option_id]++;
      }
    });
    return counts;
  }, [poll.votes, poll.options]);

  const shouldShowResults = showResults || hasVoted || isExpired;

  const handleOptionClick = (optionId: string) => {
    if (isExpired) return;
    
    if (hasVoted) {
      // Toggle vote
      if (userVotes.includes(optionId)) {
        removeVote.mutate({ pollId: poll.id, optionId, channelId, threadId });
      } else if (poll.allow_multiple) {
        votePoll.mutate({ pollId: poll.id, optionId, channelId, threadId });
      }
    } else {
      // Select for voting
      if (poll.allow_multiple) {
        setSelectedOptions(prev => 
          prev.includes(optionId) 
            ? prev.filter(id => id !== optionId)
            : [...prev, optionId]
        );
      } else {
        setSelectedOptions([optionId]);
      }
    }
  };

  const handleVote = () => {
    selectedOptions.forEach(optionId => {
      votePoll.mutate({ pollId: poll.id, optionId, channelId, threadId });
    });
    setSelectedOptions([]);
  };

  const getPercentage = (optionId: string) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCountByOption[optionId] / totalVotes) * 100);
  };

  return (
    <div className="bg-[#2b2d31] rounded-lg overflow-hidden max-w-[500px]">

      {/* Content */}
      <div className="px-3 pb-3 space-y-3">
        {/* Question */}
        <p className="text-foreground font-medium">{poll.question}</p>
        
        {!hasVoted && !isExpired && (
          <p className="text-sm text-muted-foreground">
            {poll.allow_multiple ? 'Sélectionnez une ou plusieurs réponses' : 'Sélectionnez une réponse'}
          </p>
        )}

        {/* Options */}
        <div className="space-y-2">
          {poll.options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const isVoted = userVotes.includes(option.id);
            const percentage = getPercentage(option.id);
            const voteCount = voteCountByOption[option.id];

            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={isExpired && !hasVoted}
                className={cn(
                  "w-full relative rounded-md border transition-all text-left overflow-hidden",
                  isSelected || isVoted
                    ? "border-[#5865f2] bg-[#5865f2]/10"
                    : "border-white/10 hover:border-white/20 bg-[#1e1f22]"
                )}
              >
                {/* Progress bar background */}
                {shouldShowResults && (
                  <div 
                    className="absolute inset-0 bg-[#5865f2]/20 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                <div className="relative flex items-center gap-3 p-3">
                  {/* Emoji */}
                  {option.emoji && (
                    <span className="text-lg flex-shrink-0">{option.emoji}</span>
                  )}
                  
                  {/* Text */}
                  <span className="flex-1 text-sm text-foreground">{option.text}</span>
                  
                  {/* Vote indicator or radio/checkbox */}
                  {shouldShowResults ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {voteCount} vote{voteCount !== 1 ? 's' : ''} ({percentage}%)
                      </span>
                      {isVoted && (
                        <div className="w-5 h-5 rounded-full bg-[#5865f2] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      isSelected 
                        ? "border-[#5865f2] bg-[#5865f2]" 
                        : "border-white/30"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            {poll.expires_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isExpired 
                  ? 'Terminé'
                  : `Se termine ${formatDistanceToNow(new Date(poll.expires_at), { locale: fr, addSuffix: true })}`
                }
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!shouldShowResults && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResults(true)}
                className="text-xs h-8"
              >
                Afficher les votes
              </Button>
            )}
            
            {!hasVoted && !isExpired && selectedOptions.length > 0 && (
              <Button
                onClick={handleVote}
                disabled={votePoll.isPending}
                size="sm"
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs h-8"
              >
                Voter
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
