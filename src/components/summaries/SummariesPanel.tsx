import { useState } from "react";
import { X, ScrollText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SummaryCard } from "./SummaryCard";
import { mockSummaries, type ConversationSummary } from "@/data/mockSummaries";
import { cn } from "@/lib/utils";

interface SummariesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSummary?: (summary: ConversationSummary) => void;
}

export function SummariesPanel({ isOpen, onClose, onSelectSummary }: SummariesPanelProps) {
  const [summaries, setSummaries] = useState<ConversationSummary[]>(mockSummaries);

  const handleFeedback = (id: string, feedback: 'up' | 'down' | null) => {
    setSummaries(prev =>
      prev.map(s => (s.id === id ? { ...s, feedback } : s))
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "w-80 h-full bg-card border-l border-border flex flex-col",
        "animate-in slide-in-from-right duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Résumés</h3>
          <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5">
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

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {summaries.length > 0 ? (
            summaries.map((summary) => (
              <SummaryCard
                key={summary.id}
                summary={summary}
                onFeedback={handleFeedback}
                onClick={() => onSelectSummary?.(summary)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun résumé disponible pour ce salon.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
