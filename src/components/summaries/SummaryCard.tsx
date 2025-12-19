import { useState } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/data/mockSummaries";

interface SummaryCardProps {
  summary: ConversationSummary;
  onFeedback?: (id: string, feedback: 'up' | 'down' | null) => void;
  onClick?: () => void;
}

export function SummaryCard({ summary, onFeedback, onClick }: SummaryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<'up' | 'down' | null>(summary.feedback);

  const extraParticipants = summary.participantCount - summary.participants.length;

  const handleFeedback = (type: 'up' | 'down') => {
    const newFeedback = localFeedback === type ? null : type;
    setLocalFeedback(newFeedback);
    onFeedback?.(summary.id, newFeedback);
  };

  return (
    <div
      className="p-3 rounded-lg bg-surface-hover/50 hover:bg-surface-hover cursor-pointer transition-all duration-200 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Metadata Line */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span>{summary.timestamp}</span>
        <span>•</span>
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          <span>{summary.messageCount}</span>
        </div>
        
        {/* Participants Avatars */}
        <div className="flex items-center ml-auto">
          <div className="flex -space-x-2">
            {summary.participants.slice(0, 3).map((avatar, index) => (
              <Avatar key={index} className="w-5 h-5 border-2 border-card">
                <AvatarImage src={avatar} />
                <AvatarFallback className="text-[8px] bg-primary/20">
                  {index + 1}
                </AvatarFallback>
              </Avatar>
            ))}
            {extraParticipants > 0 && (
              <div className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                <span className="text-[8px] font-medium text-muted-foreground">
                  +{extraParticipants}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-foreground text-sm mb-1">
        {summary.title}
      </h4>

      {/* Summary Body */}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {summary.summary}
      </p>

      {/* Feedback Buttons (visible on hover or when active) */}
      <div
        className={cn(
          "absolute right-2 top-2 flex items-center gap-1 transition-opacity duration-200",
          isHovered || localFeedback ? "opacity-100" : "opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => handleFeedback('up')}
          className={cn(
            "p-1.5 rounded transition-colors",
            localFeedback === 'up'
              ? "bg-green-500/20 text-green-400"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleFeedback('down')}
          className={cn(
            "p-1.5 rounded transition-colors",
            localFeedback === 'down'
              ? "bg-red-500/20 text-red-400"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
