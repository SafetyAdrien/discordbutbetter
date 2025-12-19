import { useState } from "react";
import { SummaryTopic } from "@/hooks/useSummaries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import StreamlineSummaries from "@/components/icons/StreamlineSummaries";
import { X, MessageCircle, ThumbsUp, ThumbsDown, Sparkles, Loader2, Heart } from "lucide-react";

interface SummariesDropdownProps {
  summaries: SummaryTopic[];
  onSelectTopic: (topic: SummaryTopic) => void;
  onClose: () => void;
  onGenerateSummaries?: () => void;
  isGenerating?: boolean;
  isLoading?: boolean;
  likedSummaryIds?: string[];
  onToggleLike?: (summaryId: string) => void;
}

export function SummariesDropdown({
  summaries,
  onSelectTopic,
  onClose,
  onGenerateSummaries,
  isGenerating = false,
  isLoading = false,
  likedSummaryIds = [],
  onToggleLike,
}: SummariesDropdownProps) {
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  
  const filteredSummaries = showLikedOnly 
    ? summaries.filter(s => likedSummaryIds.includes(s.id))
    : summaries;
  const hasSummaries = filteredSummaries.length > 0;
  const hasAnySummaries = summaries.length > 0;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-0 animate-slide-down">
      <div className="mx-2 sm:mx-4 bg-popover border border-border/30 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <StreamlineSummaries className="w-5 h-5 text-foreground" />
            <h3 className="font-semibold text-foreground">Résumés IA</h3>
            <Badge 
              variant="secondary" 
              className="bg-[#5865F2] text-white border-none text-[10px] px-1.5 py-0 rounded"
            >
              BETA
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowLikedOnly(!showLikedOnly)}
              className={`p-1.5 rounded transition-colors ${
                showLikedOnly 
                  ? "text-red-500 bg-red-500/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={showLikedOnly ? "Afficher tous les résumés" : "Afficher les résumés aimés"}
            >
              <Heart className={`w-4 h-4 ${showLikedOnly ? "fill-current" : ""}`} />
            </button>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : hasSummaries ? (
          <ScrollArea className="max-h-96">
            <div className="py-2">
              {filteredSummaries.map((topic) => {
                const isLiked = likedSummaryIds.includes(topic.id);
                return (
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
                          {topic.participants[0] && (
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={`/avatars/${topic.participants[0]}`} />
                              <AvatarFallback className="bg-muted text-[8px]">
                                {topic.title.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {!topic.isRead && (
                            <Badge variant="secondary" className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0">
                              Nouveau
                            </Badge>
                          )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLike?.(topic.id);
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            isLiked 
                              ? "text-[#5865F2] bg-[#5865F2]/10" 
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
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
                );
              })}
            </div>
          </ScrollArea>
        ) : showLikedOnly && hasAnySummaries ? (
          /* Empty liked state */
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="font-semibold text-foreground mb-2">Aucun résumé aimé</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Cliquez sur le pouce en haut pour aimer un résumé et le retrouver facilement ici.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowLikedOnly(false)}
              className="gap-2"
            >
              Voir tous les résumés
            </Button>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <StreamlineSummaries className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="font-semibold text-foreground mb-2">Aucun résumé disponible</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Générez des résumés IA pour comprendre rapidement les discussions de ce salon.
            </p>
            {onGenerateSummaries && (
              <Button
                onClick={onGenerateSummaries}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? "Génération en cours..." : "Générer des résumés"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
