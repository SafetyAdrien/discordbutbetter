import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Paperclip, Image as ImageIcon, Video as VideoIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleBadgePopover } from "@/components/chat/RoleBadgePopover";
import type { Attachment, RepliedMessageRef } from "@/types/app";

interface RoleForBadge {
  id: string;
  name: string;
  color?: string | null;
  icon_url?: string | null;
  description?: string | null;
}

interface RepliedLineProps {
  /**
   * Resolved snapshot of the cited message (via reply_to_id).
   * When provided, gives faithful avatar, content, attachments, jump target.
   */
  repliedMessage: RepliedMessageRef | null;

  /** Jump callback */
  onJump?: (messageId: string) => void;

  /** Visual indentation in px to align with the parent message avatar */
  indent?: number;
  /**
   * Horizontal center (in px, from the wrapper's outer edge) of the parent
   * message avatar this reply belongs to. Used to perfectly align the
   * vertical bar of the L-connector above that avatar.
   * Defaults to 20px (40px avatar centered at the wrapper's outer edge).
   */
  avatarCenter?: number;
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

// ============================================================================
// ReplyLine — absolute-positioned SVG L-connector only.
// Selectable via `.reply-line` / `[data-reply-line]`.
// ============================================================================

export interface ReplyLineProps {
  /** Horizontal center (px from wrapper outer edge) of the parent avatar. */
  avatarCenter?: number;
  /** Right edge (px from wrapper outer edge) where the arm should end. */
  endX: number;
  className?: string;
}

export function ReplyLine({ avatarCenter = 20, endX, className }: ReplyLineProps) {
  // Place SVG so its x=1 (stroke center) sits at avatarCenter.
  const left = Math.max(0, avatarCenter - 1);
  const width = Math.max(28, endX - left);

  return (
    <svg
      aria-hidden="true"
      data-reply-line
      className={cn("reply-line absolute pointer-events-auto text-border/70", className)}
      style={{
        left,
        top: 8,
        width,
        height: 26,
        overflow: "visible",
      }}
      viewBox={`0 0 ${width} 26`}
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d={`M 1 26 L 1 9 Q 1 1 9 1 L ${width} 1`}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// ============================================================================
// RepliedContent — mini-avatar + author name + role badge + preview/attachment.
// Selectable via `.replied-content` / `[data-replied-content]`.
// ============================================================================

export interface RepliedContentProps {
  repliedMessage: RepliedMessageRef | null;
  authorColor?: string;
  authorRole?: RoleForBadge | null;
  authorRoleIcon?: { iconUrl: string; name: string; color?: string | null } | null;
  isClickable?: boolean;
  className?: string;
}

export function RepliedContent({
  repliedMessage,
  authorColor,
  authorRole,
  authorRoleIcon,
  isClickable,
  className,
}: RepliedContentProps) {
  const isDeleted = repliedMessage?.deleted === true;

  const resolvedAuthor = useMemo(() => {
    if (repliedMessage?.author) {
      return {
        id: repliedMessage.author.id,
        avatar: repliedMessage.author.avatar,
        displayName: repliedMessage.author.displayName,
      };
    }
    return null;
  }, [repliedMessage]);

  const displayedAuthorName =
    resolvedAuthor?.displayName ?? (isDeleted ? "Inconnu" : "Utilisateur");

  const rawPreview = useMemo(() => {
    if (isDeleted) return "";
    if (repliedMessage) {
      const c = (repliedMessage.content || "").trim();
      if (c) return cleanPreview(c);
    }
    return "";
  }, [repliedMessage, isDeleted]);

  const attachmentInfo = useMemo(() => {
    if (!repliedMessage || isDeleted) return null;
    const atts = repliedMessage.attachments ?? [];
    if (!atts.length) return null;
    if ((repliedMessage.content || "").trim()) return null;
    return describeAttachments(atts);
  }, [repliedMessage, isDeleted]);

  const truncated =
    rawPreview.length <= MAX_PREVIEW_CHARS ? rawPreview : rawPreview.slice(0, MAX_PREVIEW_CHARS);
  const isTruncated = rawPreview.length > MAX_PREVIEW_CHARS;

  const initial = displayedAuthorName.charAt(0).toUpperCase();

  return (
    <div
      data-replied-content
      className={cn(
        "replied-content relative flex items-center gap-1.5 min-w-0",
        className,
      )}
    >
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

      {!isDeleted && authorRole?.icon_url && (
        <span className="flex-shrink-0 inline-flex items-center [&_button>img]:!w-3.5 [&_button>img]:!h-3.5 [&_button>span]:!text-[14px]">
          <RoleBadgePopover role={authorRole} />
        </span>
      )}

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
}

// ============================================================================
// RepliedLine — wrapper composing <ReplyLine /> + <RepliedContent />.
// ============================================================================

export function RepliedLine({
  repliedMessage,
  onJump,
  indent = 50,
  avatarCenter = 20,
  authorColor,
  authorRole,
  authorRoleIcon,
  className,
}: RepliedLineProps) {
  const isDeleted = repliedMessage?.deleted === true;

  const displayedAuthorName =
    repliedMessage?.author?.displayName ?? (isDeleted ? "Inconnu" : "Utilisateur");

  const rawPreview = useMemo(() => {
    if (isDeleted || !repliedMessage) return "";
    return cleanPreview(repliedMessage.content || "");
  }, [repliedMessage, isDeleted]);

  const isTruncated = rawPreview.length > MAX_PREVIEW_CHARS;

  const jumpTargetId = !isDeleted && repliedMessage?.id ? repliedMessage.id : null;
  const isClickable = Boolean(jumpTargetId && onJump && !isDeleted);

  const handleClick = () => {
    if (jumpTargetId && onJump) onJump(jumpTargetId);
  };

  // Arm of the L should end just before the mini-avatar of this row (indent - 4).
  const endX = Math.max(avatarCenter + 28, indent - 4);

  const content = (
    <div
      className={cn(
        "relative flex items-center gap-1.5 text-[13px] leading-tight select-none",
        "min-h-[18px] overflow-visible",
        isClickable && "cursor-pointer",
        className,
      )}
      style={{ paddingLeft: indent }}
    >
      <ReplyLine avatarCenter={avatarCenter} endX={endX} />
      <RepliedContent
        repliedMessage={repliedMessage}
        authorColor={authorColor}
        authorRole={authorRole}
        authorRoleIcon={authorRoleIcon}
        isClickable={isClickable}
      />
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
