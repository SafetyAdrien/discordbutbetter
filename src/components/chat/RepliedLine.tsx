import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RepliedMessageRef } from "@/types/app";
import { ReplyLine } from "@/components/chat/ReplyLine";
import { RepliedContent, cleanPreview, MAX_PREVIEW_CHARS } from "@/components/chat/RepliedContent";

// Re-exports for backward compatibility.
export { ReplyLine } from "@/components/chat/ReplyLine";
export type { ReplyLineProps } from "@/components/chat/ReplyLine";
export { RepliedContent } from "@/components/chat/RepliedContent";
export type { RepliedContentProps } from "@/components/chat/RepliedContent";

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

  // Arm of the L should end just before the mini-avatar of this row (indent - 4).
  const wrapperClasses = cn(
    "relative text-[13px] leading-tight select-none",
    "min-h-[18px] overflow-visible",
    className,
  );

  const repliedContentNode = (
    <RepliedContent
      repliedMessage={repliedMessage}
      authorColor={authorColor}
      authorRole={authorRole}
      authorRoleIcon={authorRoleIcon}
      isClickable={isClickable}
    />
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
        <div className={wrapperClasses} style={{ paddingLeft: indent }}>
          <ReplyLine avatarCenter={avatarCenter} endX={endX} />
          <div className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
            {repliedContentNode}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group/replied mb-0.5 overflow-visible">
          <div className={wrapperClasses} style={{ paddingLeft: indent }}>
            <ReplyLine avatarCenter={avatarCenter} endX={endX} />
            <button
              type="button"
              onClick={handleClick}
              aria-label={`Réponse à ${displayedAuthorName}: ${rawPreview}. Aller au message original.`}
              className="inline-flex items-center gap-1.5 min-w-0 max-w-full text-left rounded-sm cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              {repliedContentNode}
            </button>
          </div>
        </div>
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent side="top" className="max-w-xs text-xs">
          {rawPreview}
        </TooltipContent>
      )}
    </Tooltip>
  );

}
