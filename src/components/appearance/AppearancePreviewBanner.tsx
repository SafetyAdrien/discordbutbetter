import { useEffect, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import m1Back from '@/assets/appearance-banner/m1-back.png';
import m1FrontA from '@/assets/appearance-banner/m1-front-a.png';
import m1FrontB from '@/assets/appearance-banner/m1-front-b.png';
import m2Back from '@/assets/appearance-banner/m2-back.png';
import m2FrontA from '@/assets/appearance-banner/m2-front-a.png';
import m2FrontB from '@/assets/appearance-banner/m2-front-b.png';
import m3Back from '@/assets/appearance-banner/m3-back.png';
import m3FrontA from '@/assets/appearance-banner/m3-front-a.png';
import m3FrontB from '@/assets/appearance-banner/m3-front-b.png';

/**
 * Un « pane » (image encadrée) posé dans la scène.
 * `position` : coordonnées CSS (%) dans la scène 16:9.
 * `objectPosition` : cadrage interne (par défaut top-left, ce qui évite
 *                    de zoomer sur le centre et donne un aperçu naturel).
 */
type Pane = {
  src: string;
  position: CSSProperties; // left/top/width/height/right/bottom
  objectPosition?: string;
  rotate?: number;         // deg, small tilt
  elevation?: 1 | 2 | 3;   // shadow depth (1 = back, 3 = front)
  radius?: number;         // px
};

type Slide = {
  key: string;
  panes: [Pane, Pane, Pane]; // ordered back → middle → front
};

const RADIUS = 14;

/**
 * SCÈNES — chaque scène = 3 panes, cadrées propres, empilées en cascade.
 * Les objets sont pensés pour que le pane N+1 mange proprement une zone du
 * pane N (le socle 5px de son ombre portée simule la découpe demandée).
 */
const SLIDES: Slide[] = [
  {
    key: 'server',
    panes: [
      {
        src: m1Back,
        position: { left: '3%', top: '6%', width: '64%', height: '84%' },
        objectPosition: '0% 0%',
        rotate: 0,
        elevation: 1,
        radius: RADIUS,
      },
      {
        src: m1FrontA,
        position: { left: '38%', top: '20%', width: '22%', height: '70%' },
        objectPosition: '0% 0%',
        rotate: -2,
        elevation: 2,
        radius: RADIUS,
      },
      {
        src: m1FrontB,
        position: { right: '6%', top: '14%', width: '20%', height: '70%' },
        objectPosition: '0% 0%',
        rotate: 3,
        elevation: 3,
        radius: RADIUS,
      },
    ],
  },
  {
    key: 'appearance',
    panes: [
      {
        src: m2Back,
        position: { left: '3%', top: '6%', width: '66%', height: '86%' },
        objectPosition: '0% 0%',
        rotate: 0,
        elevation: 1,
        radius: RADIUS,
      },
      {
        src: m2FrontA,
        position: { left: '40%', top: '46%', width: '30%', height: '30%' },
        objectPosition: '50% 50%',
        rotate: -2,
        elevation: 2,
        radius: RADIUS,
      },
      {
        src: m2FrontB,
        position: { right: '5%', top: '22%', width: '26%', height: '30%' },
        objectPosition: '0% 50%',
        rotate: 3,
        elevation: 3,
        radius: RADIUS,
      },
    ],
  },
  {
    key: 'typography',
    panes: [
      {
        src: m3Back,
        position: { left: '3%', top: '6%', width: '64%', height: '86%' },
        objectPosition: '0% 0%',
        rotate: 0,
        elevation: 1,
        radius: RADIUS,
      },
      {
        src: m3FrontA,
        position: { left: '40%', top: '30%', width: '26%', height: '54%' },
        objectPosition: '50% 0%',
        rotate: -2,
        elevation: 2,
        radius: RADIUS,
      },
      {
        src: m3FrontB,
        position: { right: '5%', top: '26%', width: '28%', height: '26%' },
        objectPosition: '0% 50%',
        rotate: 3,
        elevation: 3,
        radius: RADIUS,
      },
    ],
  },
];

const VISIBLE_MS = 8000;
const FADE_MS = 900;

/**
 * Ombre portée épaisse « socle 5px » demandée + halo diffus.
 * Les 5 premiers px sont un solid drop-shadow de la couleur du fond,
 * ce qui produit un contour propre autour du pane et « détoure » la
 * layer du dessous — c'est le montage propre attendu.
 */
function paneShadow(elevation: 1 | 2 | 3): string {
  const socle = 'drop-shadow(0 5px 0 hsl(var(--background)))';
  switch (elevation) {
    case 1:
      return `${socle} drop-shadow(0 10px 24px hsl(0 0% 0% / 0.30))`;
    case 2:
      return `${socle} drop-shadow(0 14px 30px hsl(0 0% 0% / 0.40))`;
    case 3:
    default:
      return `${socle} drop-shadow(0 20px 40px hsl(0 0% 0% / 0.50))`;
  }
}

function PaneImg({ pane, active }: { pane: Pane; active: boolean }) {
  const radius = pane.radius ?? RADIUS;
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        ...pane.position,
        transform: `rotate(${pane.rotate ?? 0}deg)`,
        transformOrigin: 'center',
        // filter drop-shadow lets the shadow hug the rounded corners of the
        // <img> itself, not a rectangular container box.
        filter: paneShadow(pane.elevation ?? 2),
        transition: `opacity ${FADE_MS}ms ease, transform 700ms ease`,
        opacity: active ? 1 : 0,
        willChange: 'opacity, transform',
      }}
    >
      <img
        src={pane.src}
        alt=""
        draggable={false}
        loading="lazy"
        className="w-full h-full object-cover"
        style={{
          borderRadius: radius,
          objectPosition: pane.objectPosition ?? '0% 0%',
          outline: '1px solid hsl(var(--border))',
          outlineOffset: -1,
        }}
      />
    </div>
  );
}

export function AppearancePreviewBanner() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, VISIBLE_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div
      role="img"
      aria-label="Aperçu des thèmes et de la personnalisation typographique"
      className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-border/60 select-none"
      style={{
        background:
          'radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.28), transparent 55%), radial-gradient(ellipse at 85% 80%, hsl(24 95% 60% / 0.22), transparent 55%), hsl(var(--background))',
      }}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.key}
          aria-hidden={i !== index}
          className={cn('absolute inset-0', i !== index && 'pointer-events-none')}
        >
          {slide.panes.map((pane, li) => (
            <PaneImg key={li} pane={pane} active={i === index} />
          ))}
        </div>
      ))}

      {/* Slide indicator */}
      <div
        aria-hidden="true"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none z-10"
      >
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === index ? 'w-5 bg-foreground/70' : 'w-1.5 bg-foreground/25',
            )}
          />
        ))}
      </div>
    </div>
  );
}
