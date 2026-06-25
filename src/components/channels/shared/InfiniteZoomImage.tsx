import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Infinite zoom image viewer.
 * - Wheel: zoom centered on cursor
 * - Drag: pan when zoomed
 * - Double-click: toggle zoom 1x ↔ 2.5x at cursor
 */
export function InfiniteZoomImage({ src, alt, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Reset on src change
  useEffect(() => {
    setScale(1); setTx(0); setTy(0);
  }, [src]);

  const zoomAt = useCallback((cx: number, cy: number, nextScale: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ox = cx - rect.left - rect.width / 2;
    const oy = cy - rect.top - rect.height / 2;
    setScale((prev) => {
      const clamped = Math.max(0.2, Math.min(40, nextScale));
      const ratio = clamped / prev;
      setTx((t) => ox - (ox - t) * ratio);
      setTy((t) => oy - (oy - t) * ratio);
      return clamped;
    });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(e.clientX, e.clientY, scale * factor);
  }, [scale, zoomAt]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
  }, [tx, ty]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setTx(dragStart.current.tx + (e.clientX - dragStart.current.x));
    setTy(dragStart.current.ty + (e.clientY - dragStart.current.y));
  }, [dragging]);

  const endDrag = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    zoomAt(e.clientX, e.clientY, scale > 1.5 ? 1 : 2.5);
    if (scale > 1.5) { setTx(0); setTy(0); }
  }, [scale, zoomAt]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden select-none touch-none', className)}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
      style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute top-1/2 left-1/2 max-w-none will-change-transform"
        style={{
          transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 0.12s ease-out',
          maxWidth: scale <= 1 ? '100%' : 'none',
          maxHeight: scale <= 1 ? '100%' : 'none',
        }}
      />
      {scale !== 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setScale(1); setTx(0); setTy(0); }}
          className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-medium"
        >
          Réinitialiser ({Math.round(scale * 100)}%)
        </button>
      )}
    </div>
  );
}
