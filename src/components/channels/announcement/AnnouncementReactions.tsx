import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { AnnouncementReaction } from '@/hooks/useAnnouncements';

const EMOJI_LIST = [
  '👍', '👎', '❤️', '🔥', '🎉', '😂', '😮', '😢',
  '🙏', '👏', '💯', '✨', '🚀', '💪', '🤔', '👀',
  '⭐', '💡', '📢', '🔔', '✅', '❌', '⚠️', '🆕',
];

interface AnnouncementReactionsProps {
  reactions: AnnouncementReaction[];
  onToggleReaction: (emoji: string) => void;
}

export function AnnouncementReactions({ reactions, onToggleReaction }: AnnouncementReactionsProps) {
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, hasUserReacted: false };
    }
    acc[reaction.emoji].count++;
    if (reaction.user_id === user?.id) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasUserReacted: boolean }>);

  const handleEmojiClick = (emoji: string) => {
    onToggleReaction(emoji);
    setPickerOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, { count, hasUserReacted }]) => (
        <button
          key={emoji}
          onClick={() => onToggleReaction(emoji)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors',
            hasUserReacted
              ? 'bg-primary/20 border border-primary/50'
              : 'bg-muted/50 hover:bg-muted border border-transparent'
          )}
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-sm font-medium">{count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors">
            <SmilePlus className="w-5 h-5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="start">
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="p-2 hover:bg-muted rounded text-xl transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
