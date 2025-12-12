import * as React from "react";
import { cn } from "@/lib/utils";

export interface StreamlineIconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
}

/**
 * Base wrapper component for Streamline icons
 * Provides consistent API similar to Lucide React
 */
export const StreamlineIcon = React.forwardRef<SVGSVGElement, StreamlineIconProps & { children: React.ReactNode }>(
  ({ size = 24, color = "currentColor", strokeWidth = 1.5, className, children, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("shrink-0", className)}
        {...props}
      >
        {children}
      </svg>
    );
  }
);

StreamlineIcon.displayName = "StreamlineIcon";

/**
 * Helper to create icon components from Streamline SVG paths
 */
export function createStreamlineIcon(
  displayName: string,
  paths: React.ReactNode
): React.ForwardRefExoticComponent<StreamlineIconProps & React.RefAttributes<SVGSVGElement>> {
  const Icon = React.forwardRef<SVGSVGElement, StreamlineIconProps>((props, ref) => (
    <StreamlineIcon ref={ref} {...props}>
      {paths}
    </StreamlineIcon>
  ));
  Icon.displayName = displayName;
  return Icon;
}
