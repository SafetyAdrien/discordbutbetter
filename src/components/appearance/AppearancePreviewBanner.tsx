import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import bannerDark from '@/assets/appearance-banner-dark.jpg';
import bannerLight from '@/assets/appearance-banner-light.jpg';
import bannerTypo from '@/assets/appearance-banner-typography.jpg';

const SLIDES = [
  { src: bannerDark, alt: 'Aperçu du thème sombre' },
  { src: bannerLight, alt: 'Aperçu du thème clair' },
  { src: bannerTypo, alt: 'Aperçu de la personnalisation typographique' },
] as const;

const VISIBLE_MS = 8000;
const FADE_MS = 700;

export function AppearancePreviewBanner() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (reduced) return;
    let swapTimer: number;
    const cycle = window.setInterval(() => {
      setIsFading(true);
      swapTimer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % SLIDES.length);
        setIsFading(false);
      }, FADE_MS);
    }, VISIBLE_MS);
    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(swapTimer);
    };
  }, [reduced]);

  return (
    <div
      role="img"
      aria-label="Aperçu des thèmes et de la personnalisation typographique"
      className="relative w-full h-[260px] rounded-2xl overflow-hidden border border-border/50 bg-black select-none"
    >
      {SLIDES.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt=""
          aria-hidden="true"
          width={1920}
          height={544}
          loading="lazy"
          draggable={false}
          className={cn(
            'absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity ease-in-out',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ))}

      {/* Fade-to-black overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black pointer-events-none transition-opacity ease-in-out"
        style={{
          transitionDuration: `${FADE_MS}ms`,
          opacity: isFading ? 1 : 0,
        }}
      />

      {/* Bottom dots */}
      <div
        aria-hidden="true"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none"
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
