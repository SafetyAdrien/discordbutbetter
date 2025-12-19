import { SummaryTopic } from "@/hooks/useSummaries";
import { ChevronDown, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SummariesDropdown } from "./SummariesDropdown";
import StreamlineSummaries from "@/components/icons/StreamlineSummaries";

interface SummariesBarProps {
  activeTopic: SummaryTopic | null;
  isDropdownOpen: boolean;
  summaries: SummaryTopic[];
  onToggleDropdown: () => void;
  onSelectTopic: (topic: SummaryTopic) => void;
  onMarkAsRead: () => void;
}

export function SummariesBar({
  activeTopic,
  isDropdownOpen,
  summaries,
  onToggleDropdown,
  onSelectTopic,
  onMarkAsRead,
}: SummariesBarProps) {
  const isActiveMode = activeTopic !== null;

  return (
    <div className="relative w-full">
      {/* The Bar */}
      <div
        className={cn(
          "h-10 px-3 flex items-center justify-between transition-colors duration-200",
          isActiveMode
            ? "bg-[#5865F2]" // Discord brand blue
            : "bg-[#2b2d31]" // Dark gray
        )}
      >
        {/* Left Section */}
        <button
          onClick={onToggleDropdown}
          className={cn(
            "flex items-center gap-2 hover:opacity-80 transition-opacity",
            isActiveMode ? "text-white" : "text-foreground"
          )}
        >
          <StreamlineSummaries className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isActiveMode ? activeTopic.title : "Voir Tous Les Résumés"}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isDropdownOpen && "rotate-180"
            )}
          />
        </button>

        {/* Center Section (Active Mode Only) */}
        {isActiveMode && activeTopic && (
          <div className="hidden sm:flex items-center gap-1 text-white/90 text-sm">
            <span>{activeTopic.newMessages || 0}+ nouveaux messages</span>
            <span>•</span>
            <span>{activeTopic.newSummaries || 0} nouveaux résumés</span>
          </div>
        )}

        {/* Right Section */}
        {isActiveMode ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAsRead}
            className="text-white hover:text-white hover:bg-white/20 gap-1.5 h-7 px-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Marquer Comme Lu</span>
          </Button>
        ) : (
          <div className="w-8" /> // Spacer for alignment
        )}
      </div>

      {/* Dropdown Panel */}
      {isDropdownOpen && (
        <SummariesDropdown
          summaries={summaries}
          onSelectTopic={onSelectTopic}
          onClose={onToggleDropdown}
        />
      )}
    </div>
  );
}
