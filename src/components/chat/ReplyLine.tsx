import { cn } from "@/lib/utils";

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
      className={cn("reply-line absolute pointer-events-none text-border/70", className)}
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
