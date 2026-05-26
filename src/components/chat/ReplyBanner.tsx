import { Reply, X, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ReplyBannerProps {
  authorName: string;
  authorAvatar?: string | null;
  /** Optional role color for the @author label */
  authorColor?: string | null;
  content?: string;
  attachmentsCount?: number;
  onClear: () => void;
  className?: string;
}

const MAX = 64;

/**
 * Composer "Reply to @X" banner — pixel-faithful clone of the mobile DM banner
 * (see MobileDMConversation lines 651-680). Shared by ChatArea, DMConversation,
 * ThreadView and AnnouncementChannel for strict Mobile/Desktop parity.
 */
export function ReplyBanner({
  authorName,
  authorAvatar,
  authorColor,
  content,
  attachmentsCount = 0,
  onClear,
  className,
}: ReplyBannerProps) {
  const cleaned = (content || "").replace(/\s+/g, " ").trim();
  const truncated = cleaned.length > MAX ? cleaned.slice(0, MAX) : cleaned;
  const isTruncated = cleaned.length > MAX;
  const initial = (authorName || "?").charAt(0).toUpperCase();
  const hasText = truncated.length > 0;

  return (
    <div
      className={cn(
        "mx-4 mb-2 flex items-center gap-2 bg-[hsl(var(--surface-3))] rounded-xl px-3 py-2 border-l-[3px] border-primary shadow-sm",
        className,
      )}
    >
      <Reply className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Avatar className="w-5 h-5 flex-shrink-0">
        {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
        <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className="text-xs font-semibold flex-shrink-0"
          style={{ color: authorColor || "hsl(var(--primary))" }}
        >
          @{authorName}
        </span>
        {hasText ? (
          <span
            className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden min-w-0"
            style={{
              maskImage: isTruncated
                ? "linear-gradient(to right, black calc(100% - 24px), transparent)"
                : undefined,
              WebkitMaskImage: isTruncated
                ? "linear-gradient(to right, black calc(100% - 24px), transparent)"
                : undefined,
            }}
          >
            {truncated}
          </span>
        ) : attachmentsCount > 0 ? (
          <span className="text-sm text-muted-foreground italic flex items-center gap-1 min-w-0">
            <Paperclip className="w-3 h-3" />
            {attachmentsCount > 1 ? `${attachmentsCount} pièces jointes` : "Pièce jointe"}
          </span>
        ) : null}
      </div>
      <button
        onClick={onClear}
        className="p-1 hover:bg-muted rounded transition-colors"
        aria-label="Annuler la réponse"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
