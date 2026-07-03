import { useEffect, useState } from 'react';
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

type Layer = {
  src: string;
  className: string;
  style?: React.CSSProperties;
};

type Slide = {
  label: string;
  back: Layer;
  frontA: Layer;
  frontB: Layer;
};

/**
 * Chaque slide = 3 calques réels de l'interface, empilés en cascade.
 * back  : fenêtre principale, légèrement inclinée à gauche
 * frontA: carte flottante, centre-bas
 * frontB: petite carte flottante, droite
 */
const SLIDES: Slide[] = [
  {
    label: 'Vue serveur',
    back: {
      src: m1Back,
      className:
        'absolute left-[6%] top-[10%] w-[62%] h-[80%] rounded-xl shadow-2xl ring-1 ring-white/10 object-cover object-left-top',
      style: { transform: 'perspective(1200px) rotateY(6deg) rotateX(1deg)' },
    },
    frontA: {
      src: m1FrontA,
      className:
        'absolute left-[38%] top-[26%] w-[34%] h-[68%] rounded-xl shadow-2xl ring-1 ring-white/15 object-cover object-left-top',
      style: { transform: 'perspective(1200px) rotateY(-4deg)' },
    },
    frontB: {
      src: m1FrontB,
      className:
        'absolute right-[6%] top-[14%] w-[22%] h-[62%] rounded-xl shadow-2xl ring-1 ring-white/10 object-cover object-top',
      style: { transform: 'perspective(1200px) rotateY(-10deg)' },
    },
  },
  {
    label: 'Réglages d’apparence',
    back: {
      src: m2Back,
      className:
        'absolute left-[5%] top-[8%] w-[66%] h-[84%] rounded-xl shadow-2xl ring-1 ring-white/10 object-cover object-left-top',
      style: { transform: 'perspective(1200px) rotateY(5deg)' },
    },
    frontA: {
      src: m2FrontA,
      className:
        'absolute left-[42%] top-[46%] w-[32%] h-[36%] rounded-xl shadow-2xl ring-1 ring-white/15 object-cover',
      style: { transform: 'perspective(1200px) rotateY(-4deg)' },
    },
    frontB: {
      src: m2FrontB,
      className:
        'absolute right-[6%] top-[22%] w-[20%] h-[36%] rounded-xl shadow-2xl ring-1 ring-white/15 object-cover',
      style: { transform: 'perspective(1200px) rotateY(-10deg)' },
    },
  },
  {
    label: 'Typographie des catégories',
    back: {
      src: m3Back,
      className:
        'absolute left-[5%] top-[8%] w-[66%] h-[84%] rounded-xl shadow-2xl ring-1 ring-white/10 object-cover object-left-top',
      style: { transform: 'perspective(1200px) rotateY(5deg)' },
    },
    frontA: {
      src: m3FrontA,
      className:
        'absolute left-[42%] top-[32%] w-[30%] h-[56%] rounded-xl shadow-2xl ring-1 ring-white/15 object-cover object-top',
      style: { transform: 'perspective(1200px) rotateY(-4deg)' },
    },
    frontB: {
      src: m3FrontB,
      className:
        'absolute right-[5%] top-[24%] w-[24%] h-[34%] rounded-xl shadow-2xl ring-1 ring-white/15 object-cover',
      style: { transform: 'perspective(1200px) rotateY(-10deg)' },
    },
  },
];

const VISIBLE_MS = 8000;
const FADE_MS = 900;

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
      className="relative w-full h-[260px] rounded-2xl overflow-hidden border border-border/50 select-none"
      style={{
        background:
          'radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.35), transparent 55%), radial-gradient(ellipse at 85% 80%, hsl(24 95% 60% / 0.28), transparent 55%), hsl(var(--background))',
      }}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.label}
          aria-hidden="true"
          className="absolute inset-0 transition-opacity ease-in-out pointer-events-none"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        >
          {[slide.back, slide.frontA, slide.frontB].map((layer, li) => (
            <img
              key={li}
              src={layer.src}
              alt=""
              draggable={false}
              loading="lazy"
              className={cn(layer.className, 'pointer-events-none select-none')}
              style={layer.style}
            />
          ))}
        </div>
      ))}

      {/* Bottom dots */}
      <div
        aria-hidden="true"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none z-10"
      >
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === index ? 'w-5 bg-white/80' : 'w-1.5 bg-white/30',
            )}
          />
        ))}
      </div>
    </div>
  );
}
