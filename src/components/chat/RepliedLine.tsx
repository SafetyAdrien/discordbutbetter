import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/app";

interface RepliedLineProps {
  authorName: string;
  preview: string;
  /** Optional resolved message for accurate avatar + jump target */
  repliedMessage?: Message | null;
  /** Map of displayName -> author lookup for best-effort avatar resolution */
  authorLookup?: Map<string, { id: string; avatar?: string; displayName: string }>;
  /** Map keyed by displayName + content for best-effort jump resolution */
  onJump?: (messageId: string) => void;
  messages?: Message[];
  /** Visual indentation in px to align with the parent message avatar */
  indent?: number;
  /** Optional role color for the cited author */
  authorColor?: string;
  className?: string;
}

const MAX_PREVIEW_CHARS = 64;

/**
 * Strip mentions/markdown to a clean inline preview.
 * - <@id> mentions become "@username" if resolvable, else "@user"
 * - <#id> channel mentions become "#channel"
 * - markdown chars are stripped
 */
function cleanPreview(raw: string): string {
  return raw
    .replace(/<@!?([a-zA-Z0-9-]+)>/g, "@membre")
    .replace(/<#([a-zA-Z0-9-]+)>/g, "#salon")
    .replace(/<@&([a-zA-Z0-9-]+)>/g, "@rôle")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\|\|(.+?)\|\|/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function RepliedLine({
  authorName,
  preview,
  repliedMessage,
  authorLookup,
  onJump,
  messages,
  indent = 50,
  authorColor,
  className,
}: RepliedLineProps) {
  const cleaned = useMemo(() => cleanPreview(preview), [preview]);
  const truncated = useMemo(() => {
    if (cleaned.length <= MAX_PREVIEW_CHARS) return cleaned;
    return cleaned.slice(0, MAX_PREVIEW_CHARS);
  }, [cleaned]);
  const isTruncated = cleaned.length > MAX_PREVIEW_CHARS;

  // Resolve author avatar best-effort
  const resolved = useMemo(() => {
    if (repliedMessage) {
      return {
        id: repliedMessage.author.id,
        avatar: repliedMessage.author.avatar,
        displayName: repliedMessage.author.displayName,
      };
    }
    if (authorLookup) {
      // Direct hit
      const direct = authorLookup.get(authorName);
      if (direct) return direct;
      // Case-insensitive fallback
      for (const [key, val] of authorLookup) {
        if (key.toLowerCase() === authorName.toLowerCase()) return val;
      }
    }
    return null;
  }, [authorName, repliedMessage, authorLookup]);

  // Resolve jump target best-effort
  const jumpTargetId = useMemo(() => {
    if (repliedMessage) return repliedMessage.id;
    if (!messages) return null;
    const needleAuthor = authorName.toLowerCase();
    const needlePreview = cleaned.slice(0, 30).toLowerCase();
    // Search recent messages first (reverse order)
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.author.displayName.toLowerCase() !== needleAuthor) continue;
      if (m.content.toLowerCase().includes(needlePreview)) return m.id;
    }
    return null;
  }, [authorName, cleaned, repliedMessage, messages]);

  const isClickable = Boolean(jumpTargetId && onJump);
  const initial = (resolved?.displayName ?? authorName).charAt(0).toUpperCase();

  const handleClick = () => {
    if (jumpTargetId && onJump) onJump(jumpTargetId);
  };

  const content = (
    <div
      className={cn(
        "relative flex items-center gap-1.5 text-[13px] leading-tight select-none",
        "min-h-[20px]",
        isClickable && "cursor-pointer",
        className,
      )}
      style={{ paddingLeft: indent }}
    >
      {/* L-shaped connector — anchored from inside the avatar column up to this line */}
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none text-border"
        style={{
          left: indent - 30,
          top: 6,
          width: 28,
          height: 18,
        }}
        viewBox="0 0 28 18"
        fill="none"
      >
        <path
          d="M 4 18 L 4 8 Q 4 4 8 4 L 28 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Mini avatar */}
      <Avatar className="w-4 h-4 flex-shrink-0">
        {resolved?.avatar && <AvatarImage src={resolved.avatar} alt={authorName} />}
        <AvatarFallback className="text-[8px] bg-primary/15 text-primary font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>

      {/* Author name */}
      <span
        className={cn(
          "font-semibold text-[13px] flex-shrink-0 max-w-[140px] truncate",
          isClickable && "group-hover/replied:underline",
        )}
        style={authorColor ? { color: authorColor } : undefined}
      >
        {resolved?.displayName ?? authorName}
      </span>

      {/* Preview with fade-out mask (no ellipsis) */}
      <span
        className="text-[13px] text-muted-foreground min-w-0 whitespace-nowrap overflow-hidden"
        style={{
          maxWidth: "min(64ch, 70%)",
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
    </div>
  );

  if (!isClickable) {
    return (
      <div
        aria-label={`Réponse à ${authorName}: ${cleaned}`}
        className="group/replied mb-0.5"
      >
        {content}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          aria-label={`Réponse à ${authorName}: ${cleaned}. Aller au message original.`}
          className="group/replied mb-0.5 w-full text-left rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        >
          {content}
        </button>
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent side="top" className="max-w-xs text-xs">
          {cleaned}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
