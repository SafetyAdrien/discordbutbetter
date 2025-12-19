import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/data/mockSummaries";

interface SummariesContextBarProps {
  isVisible: boolean;
  currentSummary?: ConversationSummary | null;
  totalSummaries: number;
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onViewAll: () => void;
}

export function SummariesContextBar({
  isVisible,
  currentSummary,
  totalSummaries,
  currentIndex,
  onPrevious,
  onNext,
  onViewAll,
}: SummariesContextBarProps) {
  if (!isVisible || totalSummaries === 0) return null;

  return (
    <div className="h-9 bg-surface-hover/80 border-b border-border flex items-center justify-between px-4 text-sm">
      <button
        onClick={onViewAll}
        className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        {currentSummary ? (
          <span className="font-medium text-foreground truncate max-w-[200px]">
            {currentSummary.title}
          </span>
        ) : (
          <span>Voir Tous Les Résumés</span>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-2">
          {currentIndex + 1} / {totalSummaries}
        </span>
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className={cn(
            "p-1 rounded transition-colors",
            currentIndex === 0
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          disabled={currentIndex === totalSummaries - 1}
          className={cn(
            "p-1 rounded transition-colors",
            currentIndex === totalSummaries - 1
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
