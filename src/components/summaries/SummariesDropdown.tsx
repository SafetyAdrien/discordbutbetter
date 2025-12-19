import { SummaryTopic } from "@/hooks/useSummaries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText } from "lucide-react";

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
      <div className="mx-2 sm:mx-4 bg-[#111318] border border-border/50 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <ScrollText className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Résumés</h3>
          <Badge 
            variant="secondary" 
            className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0"
          >
            BÊTA
          </Badge>
        </div>

        {/* Summaries List */}
        <ScrollArea className="max-h-80">
          <div className="p-2 space-y-1">
            {summaries.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className="w-full p-3 rounded-lg bg-[#1a1d24] hover:bg-[#22262f] transition-colors text-left group"
              >
                {/* Topic Title & Time */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <ScrollText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {topic.title}
                    </span>
                    {topic.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                        {topic.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {topic.timeAgo}
                  </span>
                </div>

                {/* Summary Text */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2 ml-6">
                  {topic.summary}
                </p>

                {/* Participants */}
                <div className="flex items-center gap-2 ml-6">
                  <div className="flex -space-x-2">
                    {topic.participants.slice(0, 3).map((participant, index) => (
                      <Avatar key={index} className="w-5 h-5 border-2 border-[#1a1d24]">
                        <AvatarImage src={`/avatars/${participant}`} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                          {String.fromCharCode(65 + index)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {topic.extra > 0 && (
                      <div className="w-5 h-5 rounded-full bg-muted border-2 border-[#1a1d24] flex items-center justify-center">
                        <span className="text-[9px] text-muted-foreground">
                          +{topic.extra}
                        </span>
                      </div>
                    )}
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
