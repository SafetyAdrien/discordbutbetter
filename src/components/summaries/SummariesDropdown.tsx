import { SummaryTopic } from "@/hooks/useSummaries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import StreamlineSummaries from "@/components/icons/StreamlineSummaries";
import { X, MessageCircle, ThumbsUp, ThumbsDown } from "lucide-react";

interface SummariesDropdownProps {
  summaries: SummaryTopic[];
  onSelectTopic: (topic: SummaryTopic) => void;
  onClose: () => void;
}

export function SummariesDropdown({
  summaries,
  onSelectTopic,
  onClose,
}: SummariesDropdownProps) {
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-0 animate-slide-down">
      <div className="mx-2 sm:mx-4 bg-popover border border-border/30 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <StreamlineSummaries className="w-5 h-5 text-foreground" />
            <h3 className="font-semibold text-foreground">Summaries</h3>
            <Badge 
              variant="secondary" 
              className="bg-[#5865F2] text-white border-none text-[10px] px-1.5 py-0 rounded"
            >
              BETA
            </Badge>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summaries List */}
        <ScrollArea className="max-h-96">
          <div className="py-2">
            {summaries.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className="w-full px-4 py-3 hover:bg-muted transition-colors text-left group"
              >
                <div className="flex items-start justify-between">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Meta line: time, messages, avatar */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{topic.timeAgo}</span>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{topic.messageCount}</span>
                      </div>
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={`/avatars/${topic.participants[0]}`} />
                        <AvatarFallback className="bg-muted text-[8px]">
                          {topic.title.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-foreground text-sm mb-0.5">
                      {topic.title}
                    </h4>

                    {/* Summary */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {topic.summary}
                    </p>
                  </div>

                  {/* Right: Thumbs up/down */}
                  <div className="flex flex-col gap-1 ml-3 flex-shrink-0">
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
