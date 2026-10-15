import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Ghost } from 'lucide-react';

interface PollVoterEntry {
  id: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    username?: string;
  };
}

interface PollVotersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  totalVotes: number;
  options: { id: string; text: string; emoji: string | null }[];
  votesByOption: Record<string, PollVoterEntry[]>;
  /** Option to pre-select when the modal opens (defaults to the first option). */
  initialOptionId?: string;
}

export function PollVotersModal({
  open,
  onOpenChange,
  question,
  totalVotes,
  options,
  votesByOption,
  initialOptionId,
}: PollVotersModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(initialOptionId ?? options[0]?.id);

  useEffect(() => {
    if (open) setSelectedOptionId(initialOptionId ?? options[0]?.id);
  }, [open, initialOptionId, options]);

  const selectedVotes = selectedOptionId ? votesByOption[selectedOptionId] ?? [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] w-[95vw] h-[600px] max-h-[85vh] p-0 bg-[hsl(var(--surface-2))] border-none gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border/30 text-left">
          <DialogTitle className="font-semibold text-foreground">{question}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </p>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <div className="w-[220px] shrink-0 border-r border-border/30 overflow-y-auto py-2">
            {options.map((option) => {
              const count = votesByOption[option.id]?.length ?? 0;
              const active = option.id === selectedOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedOptionId(option.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm flex items-center gap-1.5 truncate transition-colors',
                    active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/60',
                  )}
                >
                  {option.emoji && <span className="flex-shrink-0">{option.emoji}</span>}
                  <span className="truncate">
                    {option.text} ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 p-3 space-y-1 overflow-y-auto">
            {selectedVotes.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
                <Ghost className="w-14 h-14 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">Rien à voir ici</p>
                <p className="text-xs text-muted-foreground">Il n'y a aucun vote pour cette réponse</p>
              </div>
            )}
            {selectedVotes.map((vote) => (
              <div key={vote.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/40">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={vote.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-sm bg-muted">
                    {vote.user?.display_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {vote.user?.display_name || 'Utilisateur inconnu'}
                  </p>
                  {vote.user?.username && (
                    <p className="text-xs text-muted-foreground truncate">{vote.user.username}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
