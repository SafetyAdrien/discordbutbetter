import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export const MAX_PREVIEW_CHARS = 64;

/**
 * Strip mentions/markdown to a clean inline preview.
 */
export function cleanPreview(raw: string): string {
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

export function describeAttachments(attachments: Attachment[]): { icon: JSX.Element; label: string } {
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
