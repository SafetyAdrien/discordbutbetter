import { useState } from "react";
import { X, MessageSquare, ThumbsUp, ThumbsDown, ChevronDown, ScrollText } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Données mockées pour le développement
const MOCK_SUMMARIES = [
  {
    id: 1,
    title: "Experiment And Nameplates",
    summary: "Discussion about an experiment and its cost and nameplates. The team reviewed the latest changes and approved the new design direction.",
    timeAgo: "24 Min",
    msgCount: 19,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
    ],
    extraParticipants: 2,
  },
  {
    id: 2,
    title: "Winter Drop Variant",
    summary: "Discussion about the rarity and value of the winter drop variant in PES. Members debated pricing strategies.",
    timeAgo: "25 Min",
    msgCount: 16,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar",
    ],
    extraParticipants: 0,
  },
  {
    id: 3,
    title: "Server Rules Update",
    summary: "The moderation team discussed updates to the server rules, including new guidelines for voice channels.",
    timeAgo: "1 Hour",
    msgCount: 32,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin1",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Mod2",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Mod3",
    ],
    extraParticipants: 5,
  },
  {
    id: 4,
    title: "Event Planning",
    summary: "Community event planning for the upcoming weekend. Schedule and activities were finalized.",
    timeAgo: "2 Hours",
    msgCount: 45,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Planner1",
    ],
    extraParticipants: 8,
  },
];

interface SummaryCardProps {
  summary: typeof MOCK_SUMMARIES[0];
}

function SummaryCard({ summary }: SummaryCardProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  return (
    <div className="relative pl-3 pr-3 py-3 bg-surface rounded-lg group hover:bg-surface-hover transition-colors">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
      
      {/* Meta row */}
      <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">Il y a {summary.timeAgo}</span>
        
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{summary.msgCount}</span>
        </div>
        
        {/* Participant avatars */}
        <div className="flex items-center -space-x-1.5 ml-auto">
          {summary.participants.slice(0, 3).map((avatar, idx) => (
            <Avatar key={idx} className="w-5 h-5 border-2 border-popover">
              <AvatarImage src={avatar} />
              <AvatarFallback className="text-[8px] bg-primary/20">?</AvatarFallback>
            </Avatar>
          ))}
          {summary.extraParticipants > 0 && (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium border-2 border-popover">
              +{summary.extraParticipants}
            </div>
          )}
        </div>
      </div>
      
      {/* Title */}
      <h4 className="font-semibold text-foreground text-sm mb-1">{summary.title}</h4>
      
      {/* Summary body */}
      <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">{summary.summary}</p>
      
      {/* Feedback actions */}
      <div className="flex items-center gap-1 mt-2 justify-end">
        <button
          onClick={() => setFeedback(feedback === "up" ? null : "up")}
          className={cn(
            "p-1.5 rounded transition-colors",
            feedback === "up" 
              ? "bg-green-500/20 text-green-500" 
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFeedback(feedback === "down" ? null : "down")}
          className={cn(
            "p-1.5 rounded transition-colors",
            feedback === "down" 
              ? "bg-red-500/20 text-red-500" 
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface AISummariesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISummariesPanel({ isOpen, onClose }: AISummariesPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 mx-4 bg-popover border border-border rounded-lg shadow-lg animate-in slide-in-from-top-2 fade-in-0 duration-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Résumés</h3>
          <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px] px-1.5 py-0 font-semibold">
            BÊTA
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary Cards List */}
      <ScrollArea className="max-h-80">
        <div className="p-3 space-y-2">
          {MOCK_SUMMARIES.map((summary) => (
            <SummaryCard key={summary.id} summary={summary} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface AISummariesTriggerProps {
  isActive: boolean;
  onClick: () => void;
}

export function AISummariesTrigger({ isActive, onClick }: AISummariesTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="iconSm"
      onClick={onClick}
      className={cn(isActive && "bg-surface-hover text-foreground")}
    >
      <ScrollText className={cn("w-5 h-5", isActive ? "text-foreground" : "text-muted-foreground")} />
    </Button>
  );
}

interface AISummariesSubHeaderProps {
  isVisible: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function AISummariesSubHeader({ isVisible, isExpanded, onToggle }: AISummariesSubHeaderProps) {
  if (!isVisible) return null;

  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-surface-elevated hover:bg-surface-hover border-b border-border transition-colors text-sm"
    >
      <span className="text-muted-foreground">Voir Tous Les Résumés</span>
      <ChevronDown className={cn(
        "w-4 h-4 text-muted-foreground transition-transform",
        isExpanded && "rotate-180"
      )} />
    </button>
  );
}
