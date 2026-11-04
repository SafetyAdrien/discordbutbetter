import React, { useRef, useEffect, useState } from "react";

interface ThreadSpineProps {
  /** Y offset where the vertical line starts (e.g. 44 for below avatar, 0 for grouped) */
  startY?: number;
}

/**
 * ThreadSpine — single continuous SVG L-shaped connector.
 *
 * Place as a direct child of a `relative` container.
 * The last sibling element (the thread embed) is measured to compute the curve point.
 * Draws: vertical line → rounded corner → horizontal branch.
 */
export function ThreadSpine({ startY = 44 }: ThreadSpineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pathD, setPathD] = useState("");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentElement;
    if (!parent) return;

    const update = () => {
      const parentRect = parent.getBoundingClientRect();
      // Find the thread embed — last element child that is not the SVG itself
      const children = Array.from(parent.children);
      const embed = children[children.length - 1] as HTMLElement;
      if (!embed || embed === (svg as unknown as HTMLElement)) return;

      // La branche vise la carte elle-meme (le conteneur peut etre plus large et decale).
      const card = embed.querySelector<HTMLElement>('button') ?? embed;
      const embedRect = card.getBoundingClientRect();
      const turnY = embedRect.top - parentRect.top + embedRect.height / 2;

      if (turnY <= startY) return;

      // Axe vertical = centre de l'avatar du message ; la branche s'arrete au bord gauche de la carte.
      const avatar = parent.querySelector<HTMLElement>('.w-10.h-10');
      const x = avatar ? avatar.getBoundingClientRect().left - parentRect.left + avatar.getBoundingClientRect().width / 2 : 19;
      const radius = 15;
      const endX = Math.max(x + radius + 2, embedRect.left - parentRect.left - 2);

      // Single continuous path: vertical → quadratic curve → horizontal
      const d = [`M ${x} ${startY}`, `V ${turnY - radius}`, `Q ${x} ${turnY} ${x + radius} ${turnY}`, `H ${endX}`].join(
        " ",
      );

      setPathD(d);
    };

    // Initial measure after layout
    requestAnimationFrame(update);

    // Re-measure on resize
    const observer = new ResizeObserver(update);
    observer.observe(parent);

    return () => observer.disconnect();
  }, [startY]);

  return (
    <svg
      ref={svgRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: 42, height: "100%", overflow: "visible" }}
    >
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default ThreadSpine;
