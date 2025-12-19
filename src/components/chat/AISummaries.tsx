import { useState } from "react";
import { ChevronDown, ChevronUp, X, MessageSquare, ThumbsUp, ThumbsDown, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Mock data for AI summaries
const mockSummaries = [
  {
    id: 1,
    title: "Experiment And Nameplates",
    summary: "Discussion about an experiment and its cost and nameplates.",
    timestamp: "Il y a 24 Min",
    messageCount: 19,
    participants: [
      "https://i.pravatar.cc/150?img=1",
      "https://i.pravatar.cc/150?img=2",
      "https://i.pravatar.cc/150?img=3",
    ],
    extraParticipants: 2,
  },
  {
    id: 2,
    title: "Winter Drop Variant",
    summary: "Discussion about the rarity and value of the winter drop variant in PES.",
    timestamp: "Il y a 25 Min",
    messageCount: 16,
    participants: [
      "https://i.pravatar.cc/150?img=4",
      "https://i.pravatar.cc/150?img=5",
      "https://i.pravatar.cc/150?img=6",
    ],
    extraParticipants: 0,
  },
  {
    id: 3,
    title: "New Feature Rollout",
    summary: "Planning the rollout schedule for the upcoming features.",
    timestamp: "Il y a 1 Heure",
    messageCount: 32,
    participants: [
      "https://i.pravatar.cc/150?img=7",
      "https://i.pravatar.cc/150?img=8",
      "https://i.pravatar.cc/150?img=9",
      "https://i.pravatar.cc/150?img=10",
    ],
    extraParticipants: 5,
  },
  {
    id: 4,
    title: "Bug Fixes Discussion",
    summary: "Team discussion about critical bug fixes needed before release.",
    timestamp: "Il y a 2 Heures",
    messageCount: 28,
    participants: [
      "https://i.pravatar.cc/150?img=11",
      "https://i.pravatar.cc/150?img=12",
    ],
    extraParticipants: 1,
  },
];

interface SummaryCardProps {
  summary: typeof mockSummaries[0];
}

function SummaryCard({ summary }: SummaryCardProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  return (
    <div className="p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors border border-border/30">
      {/* Metadata row */}
      <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
        <span>{summary.timestamp}</span>
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{summary.messageCount}</span>
        </div>
        
        {/* Avatar stack */}
        <div className="flex items-center -space-x-1.5 ml-auto">
          {summary.participants.slice(0, 4).map((avatar, index) => (
            <Avatar key={index} className="w-5 h-5 border-2 border-surface-elevated">
              <AvatarImage src={avatar} alt="Participant" />
              <AvatarFallback className="text-[8px]">U</AvatarFallback>
            </Avatar>
          ))}
          {summary.extraParticipants > 0 && (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium border-2 border-surface-elevated">
              +{summary.extraParticipants}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm truncate mb-0.5">
            {summary.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {summary.summary}
          </p>
        </div>

        {/* Feedback buttons */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
            className={cn(
              "p-1 rounded transition-colors",
              feedback === "up"
                ? "bg-green-500/20 text-green-400"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
            className={cn(
              "p-1 rounded transition-colors",
              feedback === "down"
                ? "bg-red-500/20 text-red-400"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AISummaries() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {/* Control Bar / Toggle */}
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full h-10 px-4 flex items-center justify-center gap-2",
            "bg-surface-elevated/80 hover:bg-surface-hover transition-colors",
            "border-b border-border/30 text-sm text-muted-foreground hover:text-foreground",
            "cursor-pointer select-none"
          )}
        >
          <span className="font-medium">Voir Tous Les Résumés</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </PopoverTrigger>

      {/* Dropdown Panel */}
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={0}
        className="w-[calc(100vw-2rem)] sm:w-[400px] md:w-[480px] max-w-[480px] p-0 border border-border/50 bg-card shadow-xl rounded-lg"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Résumés</h3>
            <Badge 
              variant="secondary" 
              className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0 font-semibold uppercase"
            >
              Bêta
            </Badge>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-3 space-y-2">
            {mockSummaries.map((summary) => (
              <SummaryCard key={summary.id} summary={summary} />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
