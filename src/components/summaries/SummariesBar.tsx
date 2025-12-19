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
  // Calculate total new messages from all summaries
  const totalNewMessages = summaries.reduce((acc, s) => acc + (s.newMessages || 0), 0);

  return (
    <div className="relative w-full">
      {/* The Bar - Always blue */}
      <div className="h-10 px-3 flex items-center justify-between bg-[#5865F2]">
        {/* Left Section */}
        <button
          onClick={onToggleDropdown}
          className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
        >
          <StreamlineSummaries className="w-4 h-4" />
          <span className="text-sm font-medium">Voir Tous Les Résumés</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isDropdownOpen && "rotate-180"
            )}
          />
        </button>

        {/* Center Section - Message count */}
        <div className="hidden sm:flex items-center text-white/90 text-sm">
          <span>{totalNewMessages} nouveaux messages</span>
        </div>

        {/* Right Section */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAsRead}
          className="text-white hover:text-white hover:bg-white/20 gap-1.5 h-7 px-2"
        >
          <CheckCheck className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Marquer Comme Lu</span>
        </Button>
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
