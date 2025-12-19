import { SummaryTopic } from "@/hooks/useSummaries";
import { ChevronDown, CheckCheck, Sparkles, Loader2 } from "lucide-react";
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
  onGenerateSummaries?: () => void;
  isGenerating?: boolean;
  isLoading?: boolean;
}

export function SummariesBar({
  activeTopic,
  isDropdownOpen,
  summaries,
  onToggleDropdown,
  onSelectTopic,
  onMarkAsRead,
  onGenerateSummaries,
  isGenerating = false,
  isLoading = false,
}: SummariesBarProps) {
  // Calculate total new messages from all summaries
  const totalNewMessages = summaries.reduce((acc, s) => acc + (s.newMessages || 0), 0);
  const hasUnreadMessages = totalNewMessages > 0;
  const hasSummaries = summaries.length > 0;

  return (
    <div className="relative w-full">
      {/* The Bar - Blue when unread, themed when no unread */}
      <div
        className={cn(
          "h-10 px-3 flex items-center justify-between transition-colors",
          hasUnreadMessages ? "bg-[#5865F2]" : "bg-muted"
        )}
      >
        {/* Left Section */}
        <button
          onClick={onToggleDropdown}
          className={cn(
            "flex items-center gap-2 hover:opacity-80 transition-opacity",
            hasUnreadMessages ? "text-white" : "text-foreground"
          )}
        >
          <StreamlineSummaries className="w-4 h-4" />
          <span className="text-sm font-medium">
            {hasSummaries ? "Voir Tous Les Résumés" : "Résumés IA"}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isDropdownOpen && "rotate-180"
            )}
          />
        </button>

        {/* Center Section - Message count (only when unread) */}
        {hasUnreadMessages && (
          <div className="hidden sm:flex items-center text-white/90 text-sm">
            <span>{totalNewMessages} nouveaux messages</span>
          </div>
        )}

        {/* Right Section */}
        {hasUnreadMessages ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAsRead}
            className="text-white hover:text-white hover:bg-white/20 gap-1.5 h-7 px-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Marquer Comme Lu</span>
          </Button>
        ) : onGenerateSummaries ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateSummaries}
            disabled={isGenerating || isLoading}
            className={cn(
              "gap-1.5 h-7 px-2",
              hasUnreadMessages 
                ? "text-white hover:text-white hover:bg-white/20" 
                : "text-foreground hover:bg-muted-foreground/10"
            )}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">
              {isGenerating ? "Génération..." : "Générer"}
            </span>
          </Button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Dropdown Panel */}
      {isDropdownOpen && (
        <SummariesDropdown
          summaries={summaries}
          onSelectTopic={onSelectTopic}
          onClose={onToggleDropdown}
          onGenerateSummaries={onGenerateSummaries}
          isGenerating={isGenerating}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
