import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Paperclip, Image as ImageIcon, Video as VideoIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleBadgePopover } from "@/components/chat/RoleBadgePopover";
import type { Attachment, Message, RepliedMessageRef } from "@/types/app";

interface RoleForBadge {
  id: string;
  name: string;
  color?: string | null;
  icon_url?: string | null;
  description?: string | null;
}

interface RepliedLineProps {
  /**
   * Preferred path: the resolved snapshot of the cited message (via reply_to_id).
   * When provided, gives faithful avatar, content, attachments, jump target.
   */
  repliedMessage?: RepliedMessageRef | null;

  /** Legacy fallback: cited author display name parsed from markdown blockquote */
  authorName?: string;
  /** Legacy fallback: preview text parsed from markdown blockquote */
  preview?: string;

  /** Best-effort author lookup (legacy fallback) */
  authorLookup?: Map<string, { id: string; avatar?: string; displayName: string }>;
  /** Messages list for legacy jump resolution */
  messages?: Message[];
  /** Jump callback */
  onJump?: (messageId: string) => void;

  /** Visual indentation in px to align with the parent message avatar */
  indent?: number;
  /** Optional role color for the cited author (semibold pseudo color) */
  authorColor?: string;
  /** Optional full role object — rendered via RoleBadgePopover (Discord-like pill) */
  authorRole?: RoleForBadge | null;
  /** @deprecated kept for backward-compat — prefer authorRole */
  authorRoleIcon?: { iconUrl: string; name: string; color?: string | null } | null;
  className?: string;
}

const MAX_PREVIEW_CHARS = 64;

/**
 * Strip mentions/markdown to a clean inline preview.
 * - <@id> mentions become "@membre"
 * - <#id> channel mentions become "#salon"
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

function describeAttachments(attachments: Attachment[]): { icon: JSX.Element; label: string } {
  if (attachments.length === 1) {
    const a = attachments[0];
    if (a.type === "image") return { icon: <ImageIcon className="w-3 h-3" />, label: "Image" };
    if (a.type === "video") return { icon: <VideoIcon className="w-3 h-3" />, label: "Vidéo" };
    return { icon: <FileText className="w-3 h-3" />, label: a.name || "Fichier" };
  }
  return {
    icon: <Paperclip className="w-3 h-3" />,
    label: `${attachments.length} pièces jointes`,
  };
}

export function RepliedLine({
  repliedMessage,
  authorName,
  preview,
  authorLookup,
  messages,
  onJump,
  indent = 50,
  authorColor,
  authorRole,
  authorRoleIcon,
  className,
}: RepliedLineProps) {
  // ---- Resolve display data ----
  const isDeleted = repliedMessage?.deleted === true;

  // Author resolution (fidelity mode wins)
  const resolvedAuthor = useMemo(() => {
    if (repliedMessage?.author) {
      return {
        id: repliedMessage.author.id,
        avatar: repliedMessage.author.avatar,
        displayName: repliedMessage.author.displayName,
      };
    }
    if (!authorName) return null;
    if (authorLookup) {
      const direct = authorLookup.get(authorName);
      if (direct) return direct;
      for (const [key, val] of authorLookup) {
        if (key.toLowerCase() === authorName.toLowerCase()) return val;
      }
    }
    return null;
  }, [repliedMessage, authorName, authorLookup]);

  const displayedAuthorName =
    resolvedAuthor?.displayName ?? authorName ?? (isDeleted ? "Inconnu" : "Utilisateur");

  // Content resolution
  const rawPreview = useMemo(() => {
    if (isDeleted) return "";
    if (repliedMessage) {
      const c = (repliedMessage.content || "").trim();
      if (c) return cleanPreview(c);
      const atts = repliedMessage.attachments ?? [];
      if (atts.length > 0) return ""; // we render an attachment chip instead
      return "";
    }
    return cleanPreview(preview ?? "");
  }, [repliedMessage, preview, isDeleted]);

  const attachmentInfo = useMemo(() => {
    if (!repliedMessage || isDeleted) return null;
    const atts = repliedMessage.attachments ?? [];
    if (!atts.length) return null;
    if ((repliedMessage.content || "").trim()) return null; // text wins
    return describeAttachments(atts);
  }, [repliedMessage, isDeleted]);

  const truncated = useMemo(() => {
    if (rawPreview.length <= MAX_PREVIEW_CHARS) return rawPreview;
    return rawPreview.slice(0, MAX_PREVIEW_CHARS);
  }, [rawPreview]);
  const isTruncated = rawPreview.length > MAX_PREVIEW_CHARS;

  // ---- Resolve jump target ----
  const jumpTargetId = useMemo(() => {
    if (isDeleted) return null;
    if (repliedMessage?.id) return repliedMessage.id;
    // legacy: best-effort search by author display name + content
    if (!messages || !authorName) return null;
    const needleAuthor = authorName.toLowerCase();
    const needlePreview = (preview ?? "").slice(0, 30).toLowerCase();
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.author.displayName.toLowerCase() !== needleAuthor) continue;
      if (m.content.toLowerCase().includes(needlePreview)) return m.id;
    }
    return null;
  }, [repliedMessage, messages, authorName, preview, isDeleted]);

  const isClickable = Boolean(jumpTargetId && onJump && !isDeleted);
  const initial = displayedAuthorName.charAt(0).toUpperCase();

  const handleClick = () => {
    if (jumpTargetId && onJump) onJump(jumpTargetId);
  };

  // Connector L positioning: the L is rooted in the avatar gutter of the
  // message BELOW this line and curves up-right to meet this reply row.
  // The SVG extends downward beyond the row (overflow-visible) to reach into
  // the parent avatar's vertical zone.
  // connectorLeft sits roughly at the center of the parent avatar (≈20px from left).
  const connectorLeft = Math.max(0, indent - 36);
  const connectorWidth = Math.max(28, indent - connectorLeft - 4);

  const content = (
    <div
      className={cn(
        "relative flex items-center gap-1.5 text-[13px] leading-tight select-none",
        "min-h-[20px] overflow-visible",
        isClickable && "cursor-pointer",
        className,
      )}
      style={{ paddingLeft: indent }}
    >
      {/* L-shaped connector — rooted in the avatar gutter of the message BELOW,
          curving up and to the right toward the mini-avatar of this reply row. */}
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none text-border/70"
        style={{
          left: connectorLeft,
          top: 10,
          width: connectorWidth,
          height: 24,
          overflow: "visible",
        }}
        viewBox={`0 0 ${connectorWidth} 24`}
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d={`M 1 24 L 1 8 Q 1 1 8 1 L ${connectorWidth} 1`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Mini avatar (real avatar in fidelity mode) */}
      <Avatar className="w-4 h-4 flex-shrink-0">
        {!isDeleted && resolvedAuthor?.avatar && (
          <AvatarImage src={resolvedAuthor.avatar} alt={displayedAuthorName} />
        )}
        <AvatarFallback
          className={cn(
            "text-[8px] font-semibold",
            isDeleted ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
          )}
        >
          {isDeleted ? "?" : initial}
        </AvatarFallback>
      </Avatar>

      {/* Author name (with @ prefix, role-colored) */}
      {!isDeleted && (
        <span
          className={cn(
            "font-semibold text-[13px] flex-shrink-0 max-w-[160px] truncate",
            isClickable && "group-hover/replied:underline",
          )}
          style={authorColor ? { color: authorColor } : undefined}
        >
          @{displayedAuthorName}
        </span>
      )}

      {/* Role badge — preferred path: full RoleBadgePopover (compact) */}
      {!isDeleted && authorRole?.icon_url && (
        <span className="flex-shrink-0 inline-flex items-center [&_button>img]:!w-3.5 [&_button>img]:!h-3.5 [&_button>span]:!text-[14px]">
          <RoleBadgePopover role={authorRole} />
        </span>
      )}

      {/* Legacy fallback: plain icon (kept for non-server contexts) */}
      {!isDeleted && !authorRole?.icon_url && authorRoleIcon?.iconUrl && (
        <span
          className="flex-shrink-0 inline-flex items-center"
          title={authorRoleIcon.name}
          aria-label={`Rôle: ${authorRoleIcon.name}`}
        >
          {authorRoleIcon.iconUrl.startsWith("http") ? (
            <img
              src={authorRoleIcon.iconUrl}
              alt={authorRoleIcon.name}
              className="w-3.5 h-3.5 object-contain"
            />
          ) : (
            <span className="text-[13px] leading-none">{authorRoleIcon.iconUrl}</span>
          )}
        </span>
      )}

      {/* Body: deleted, attachment chip, or text preview */}
      {isDeleted ? (
        <span className="text-[13px] text-muted-foreground italic">
          Message original supprimé
        </span>
      ) : attachmentInfo ? (
        <span className="text-[13px] text-muted-foreground italic flex items-center gap-1 min-w-0">
          {attachmentInfo.icon}
          <span className="truncate">{attachmentInfo.label}</span>
        </span>
      ) : (
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
      )}
    </div>
  );

  if (!isClickable) {
    return (
      <div
        aria-label={
          isDeleted
            ? "Message original supprimé"
            : `Réponse à ${displayedAuthorName}: ${rawPreview}`
        }
        className="group/replied mb-0.5 overflow-visible"
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
          aria-label={`Réponse à ${displayedAuthorName}: ${rawPreview}. Aller au message original.`}
          className="group/replied mb-0.5 w-full text-left rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 overflow-visible"
        >
          {content}
        </button>
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent side="top" className="max-w-xs text-xs">
          {rawPreview}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
