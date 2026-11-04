import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser } from 'lucide-react';
import { Pen, Trash2, X } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { useMediaAnnotations, useCreateAnnotation, useClearMyAnnotations, type Annotation } from '@/hooks/useMediaAnnotations';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  postId: string;
  itemId: string;
  width: number;
  height: number;
  active: boolean;
  onClose?: () => void;
  className?: string;
}

const PALETTE = ['#ff3366', '#ffcc00', '#33cc66', '#3399ff', '#9966ff', '#ffffff', '#111111'];
const SIZES = [3, 6, 10];

export function CanvasLiveOverlay({ postId, itemId, width, height, active, onClose, className }: Props) {
  const { user } = useAuth();
  const { data: strokes = [] } = useMediaAnnotations(itemId);
  const createStroke = useCreateAnnotation();
  const clearMine = useClearMyAnnotations();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState(SIZES[1]);
  const drawingRef = useRef<{ x: number; y: number }[] | null>(null);
  const liveRef = useRef<{ x: number; y: number }[]>([]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    const renderStroke = (s: Pick<Annotation, 'points' | 'color' | 'size' | 'tool'>) => {
      if (!s.points.length) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = s.size;
      ctx.strokeStyle = s.color;
      ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.beginPath();
      const p0 = s.points[0];
      ctx.moveTo(p0.x * c.width, p0.y * c.height);
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i];
        ctx.lineTo(p.x * c.width, p.y * c.height);
      }
      ctx.stroke();
    };

    for (const s of strokes) renderStroke(s);
    if (liveRef.current.length > 1) {
      renderStroke({ points: liveRef.current, color, size, tool });
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [strokes, color, size, tool]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = width;
    c.height = height;
    draw();
  }, [width, height, draw]);

  useEffect(() => { draw(); }, [draw]);

  const toLocal = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active || !user) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    liveRef.current = [p];
    drawingRef.current = liveRef.current;
    draw();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = toLocal(e.clientX, e.clientY);
    liveRef.current.push(p);
    draw();
  };
  const onPointerUp = async () => {
    if (!drawingRef.current || !user) { drawingRef.current = null; return; }
    const pts = liveRef.current;
    drawingRef.current = null;
    if (pts.length >= 2) {
      try {
        await createStroke.mutateAsync({ post_id: postId, item_id: itemId, tool, color, size, points: pts });
      } catch {}
    }
    liveRef.current = [];
    draw();
  };

  return (
    <div className={cn('absolute inset-0 z-30 pointer-events-none', className)}>
      <canvas
        ref={canvasRef}
        className={cn('w-full h-full', active ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {active && (
        <div className="pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-background/95 backdrop-blur border border-border shadow-lg">
          <button type="button"
            onClick={() => setTool('pen')}
            className={cn('p-1.5 rounded-full', tool === 'pen' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            title="Crayon"
          >
            <Pen className="w-4 h-4" />
          </button>
          <button type="button"
            onClick={() => setTool('eraser')}
            className={cn('p-1.5 rounded-full', tool === 'eraser' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            title="Gomme"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          {PALETTE.map((c) => (
            <button type="button"
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              className={cn('w-5 h-5 rounded-full border', color === c && tool === 'pen' ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : 'border-border/40')}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          {SIZES.map((s) => (
            <button type="button"
              key={s}
              onClick={() => setSize(s)}
              className={cn('w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted', size === s && 'bg-muted')}
              title={`${s}px`}
            >
              <span className="rounded-full bg-foreground" style={{ width: s, height: s }} />
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          <button type="button"
            onClick={() => clearMine.mutate({ itemId })}
            className="p-1.5 rounded-full hover:bg-muted text-destructive"
            title="Effacer mes traits"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted" title="Fermer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
