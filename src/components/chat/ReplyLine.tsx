import { cn } from "@/lib/utils";

// ============================================================================
// ReplyLine — absolute-positioned SVG L-connector only.
// Selectable via `.reply-line` / `[data-reply-line]`.
// When `onClick` is provided, only the stroke of the path is clickable
// (the SVG bounding box stays transparent to pointer events).
// ============================================================================

export interface ReplyLineProps {
  /** Horizontal center (px from wrapper outer edge) of the parent avatar. */
  avatarCenter?: number;
  /** Right edge (px from wrapper outer edge) where the arm should end. */
  endX: number;
  /** Optional click handler — clicking the connector line itself triggers it. */
  onClick?: () => void;
  /** Optional aria-label for clickable variant. */
  ariaLabel?: string;
  className?: string;
}

export function ReplyLine({
  avatarCenter = 20,
  endX,
  onClick,
  ariaLabel,
  className,
}: ReplyLineProps) {
  // Place SVG so its x=1 (stroke center) sits at avatarCenter.
  const left = Math.max(0, avatarCenter - 1);
  const width = Math.max(28, endX - left);
  const interactive = typeof onClick === "function";

  return (
    <svg
      aria-hidden={interactive ? undefined : true}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      data-reply-line
      className={cn(
        "reply-line absolute pointer-events-none text-border/70 focus:outline-none",
        className,
      )}

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
        onClick={interactive ? onClick : undefined}
        style={
          interactive
            ? { pointerEvents: "stroke", cursor: "pointer" }
            : undefined
        }
      />
    </svg>
  );
}
