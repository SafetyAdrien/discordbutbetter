import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { SceneGlobal } from './preview-scenes/SceneGlobal';
import { SceneProfileSettings } from './preview-scenes/SceneProfileSettings';
import { SceneDMs } from './preview-scenes/SceneDMs';
import { scenePalettes, type SceneTheme } from './preview-scenes/sceneTokens';

/**
 * A single stacked layer inside a scene.
 * `position` uses CSS percentages within the 16:9 stage, so scenes stay
 * proportional at any banner width.
 */
type Pane = {
  Scene: () => JSX.Element;
  theme: SceneTheme;
  position: CSSProperties;
  rotate?: number;
  elevation?: 1 | 2 | 3;
};

type Slide = {
  key: string;
  label: string;
  panes: [Pane, Pane, Pane];
};

/** Small aesthetic offsets so each moment feels handmade instead of gridded. */
const SLIDES: Slide[] = [
  {
    key: 'global',
    label: 'Interface globale',
    panes: [
      { Scene: SceneGlobal, theme: 'dark', position: { left: '4%', top: '8%', width: '60%', height: '84%' }, rotate: -1, elevation: 1 },
      { Scene: SceneProfileSettings, theme: 'light', position: { left: '32%', top: '22%', width: '40%', height: '66%' }, rotate: 2, elevation: 2 },
      { Scene: SceneDMs, theme: 'dark', position: { right: '4%', top: '14%', width: '38%', height: '72%' }, rotate: -2, elevation: 3 },
    ],
  },
  {
    key: 'profile',
    label: 'Profil & Paramètres',
    panes: [
      { Scene: SceneDMs, theme: 'dark', position: { left: '4%', top: '10%', width: '46%', height: '80%' }, rotate: -2, elevation: 1 },
      { Scene: SceneGlobal, theme: 'dark', position: { left: '26%', top: '20%', width: '46%', height: '72%' }, rotate: 1, elevation: 2 },
      { Scene: SceneProfileSettings, theme: 'light', position: { right: '4%', top: '12%', width: '46%', height: '76%' }, rotate: 3, elevation: 3 },
    ],
  },
  {
    key: 'dms',
    label: 'Messages privés',
    panes: [
      { Scene: SceneProfileSettings, theme: 'light', position: { left: '4%', top: '10%', width: '48%', height: '78%' }, rotate: -2, elevation: 1 },
      { Scene: SceneGlobal, theme: 'dark', position: { left: '28%', top: '18%', width: '44%', height: '74%' }, rotate: 1, elevation: 2 },
      { Scene: SceneDMs, theme: 'dark', position: { right: '4%', top: '12%', width: '46%', height: '78%' }, rotate: -1, elevation: 3 },
    ],
  },
];

/** Pane wrapper: applies theme scope, socle shadow (via ::after), rotation, elevation. */
function PaneBox({ pane, active }: { pane: Pane; active: boolean }) {
  const palette = scenePalettes[pane.theme];
  const socleColor = 'hsl(var(--background))';
  const shadowY = 8 + (pane.elevation ?? 1) * 4;
  const shadowBlur = 16 + (pane.elevation ?? 1) * 8;
  const zIndex = 10 + (pane.elevation ?? 1);

  return (
    <div
      className={cn(
        'absolute overflow-hidden rounded-[10px] border border-[hsl(var(--border))]',
        palette.className,
        !active && 'pointer-events-none',
      )}
      style={{
        ...pane.position,
        ...palette.style,
        transform: `rotate(${pane.rotate ?? 0}deg) translateZ(0)`,
        transformOrigin: 'center',
        opacity: active ? 1 : 0,
        transition: 'opacity var(--banner-fade, 800ms) ease',
        willChange: 'opacity',
        zIndex,
        boxShadow: `0 5px 0 0 ${socleColor}, 0 ${shadowY}px ${shadowBlur}px hsl(0 0% 0% / 0.35)`,
      }}
      aria-hidden
    >
      <pane.Scene />
    </div>
  );
}

export function AppearancePreviewBanner() {
  const reduced = useReducedMotion();
  const { isMobile } = useBreakpoint();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pause when scrolled out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setVisible(e.isIntersecting)),
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    const interval = isMobile ? 6000 : 8000;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), interval);
    return () => window.clearInterval(id);
  }, [reduced, visible, isMobile]);

  const fadeMs = isMobile ? 500 : 800;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Aperçu — ${SLIDES[index].label}`}
      className="relative w-full h-[240px] md:h-[280px] rounded-2xl overflow-hidden border border-border/60 select-none"
      style={{
        // custom prop so PaneBox reads a per-instance duration
        ['--banner-fade' as string]: `${fadeMs}ms`,
        background:
          'radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.28), transparent 55%), radial-gradient(ellipse at 85% 80%, hsl(24 95% 60% / 0.22), transparent 55%), hsl(var(--background))',
      }}
    >
      {SLIDES.map((slide, i) => (
        <div key={slide.key} className="absolute inset-0" aria-hidden={i !== index}>
          {slide.panes.map((pane, li) => (
            <PaneBox key={li} pane={pane} active={i === index} />
          ))}
        </div>
      ))}

      {/* Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none z-40">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            aria-label={`Aller à : ${s.label}`}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300 pointer-events-auto',
              i === index ? 'w-6 bg-foreground/70' : 'w-1.5 bg-foreground/25 hover:bg-foreground/50',
            )}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
