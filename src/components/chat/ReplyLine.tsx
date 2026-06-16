import { useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// ReplyLine — absolute-positioned SVG L-connector only.
// Selectable via `.reply-line` / `[data-reply-line]`.
// When `onClick` is provided, the stroke is ONLY clickable while hovered.
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
  const [hovered, setHovered] = useState(false);

  const left = Math.max(0, avatarCenter - 1);
  const width = Math.max(28, endX - left);
  const interactive = typeof onClick === "function";
  const active = interactive && hovered;

  const pathD = `M 1 26 L 1 9 Q 1 1 9 1 L ${width} 1`;

  return (
    <svg
      aria-hidden={active ? undefined : true}
      role={active ? "button" : undefined}
      aria-label={active ? ariaLabel : undefined}
      tabIndex={active ? 0 : undefined}
      onKeyDown={
        active
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
        "reply-line absolute pointer-events-none focus:outline-none",
        hovered ? "text-foreground/80" : "text-border/70",
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
      {/* Visible line */}
      <path
        d={pathD}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Invisible hit area — only present when interactive; hover activates clickability */}
      {interactive && (
        <path
          d={pathD}
          stroke="transparent"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          style={{ pointerEvents: "stroke", cursor: "pointer" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onClick}
        />
      )}
    </svg>
  );
}
