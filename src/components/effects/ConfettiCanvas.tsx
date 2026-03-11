import { useRef, useEffect, useCallback, memo } from 'react';

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  gravity: number;
}

interface ConfettiCanvasProps {
  /** Whether to trigger the confetti animation */
  active: boolean;
  /** Number of confetti pieces */
  count?: number;
  /** Duration in ms before auto-cleanup */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Custom colors (HSL values) */
  colors?: string[];
}

const DEFAULT_COLORS = [
  'hsl(340, 82%, 59%)',  // pink
  'hsl(270, 76%, 62%)',  // purple
  'hsl(200, 95%, 60%)',  // blue
  'hsl(45, 95%, 58%)',   // gold
  'hsl(140, 70%, 50%)',  // green
  'hsl(25, 95%, 60%)',   // orange
];

function ConfettiCanvasInner({
  active,
  count = 100,
  duration = 3000,
  onComplete,
  colors = DEFAULT_COLORS,
}: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const startTimeRef = useRef(0);

  const createPieces = useCallback((w: number, h: number) => {
    return Array.from({ length: count }, (): ConfettiPiece => ({
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.6,
      y: h * 0.3 + (Math.random() - 0.5) * h * 0.3,
      vx: (Math.random() - 0.5) * 12,
      vy: -(Math.random() * 8 + 4),
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      width: Math.random() * 8 + 4,
      height: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      gravity: 0.12 + Math.random() * 0.08,
    }));
  }, [count, colors]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    piecesRef.current = createPieces(w, h);
    startTimeRef.current = performance.now();

    const draw = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const fadeStart = duration * 0.7;

      ctx.clearRect(0, 0, w, h);

      let allDone = true;

      for (const p of piecesRef.current) {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;

        // Fade out
        if (elapsed > fadeStart) {
          p.alpha = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
        }

        if (p.alpha <= 0 || p.y > h + 50) continue;
        allDone = false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
      }

      if (allDone || elapsed > duration) {
        ctx.clearRect(0, 0, w, h);
        onComplete?.();
        return;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [active, createPieces, duration, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

export const ConfettiCanvas = memo(ConfettiCanvasInner);
