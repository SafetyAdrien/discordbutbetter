import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, RotateCcw, ZoomIn, ZoomOut, Move, FlipHorizontal2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditorTransform {
  src: string;
  displayedW: number;
  displayedH: number;
  offsetX: number;
  offsetY: number;
  flip: boolean;
  PREVIEW: number;
}

export interface MediaEditorResult {
  blob: Blob;
  mime: string;
  ext: string;
}

interface MediaEditorProps {
  open: boolean;
  file: File | null;
  title: string;
  /** Square output size in pixels (the canvas is always square). */
  outputSize?: number;
  /** Mask the editing canvas as a circle (for avatars / server icons). */
  circular?: boolean;
  /** Render previews on the right side using the live transform. */
  renderPreviews?: (t: EditorTransform) => ReactNode;
  /** Optional extra content rendered between previews and the Finish button. */
  extra?: ReactNode;
  finishLabel?: string;
  onClose: () => void;
  onFinish: (result: MediaEditorResult) => void;
}

const DEFAULT_PREVIEW = 380;

/**
 * A small helper that renders the source image using the transform produced by
 * MediaEditor, scaled into an arbitrary preview box. Use this inside renderPreviews.
 */
export function EditorPreviewImage({
  t,
  size,
  circular,
  className,
}: {
  t: EditorTransform;
  size: number;
  circular?: boolean;
  className?: string;
}) {
  const r = size / t.PREVIEW;
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted shrink-0',
        circular ? 'rounded-full' : 'rounded-md',
        className
      )}
      style={{ width: size, height: size }}
    >
      {t.src && (
        <img
          src={t.src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            width: t.displayedW * r,
            height: t.displayedH * r,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${t.offsetX * r}px, ${t.offsetY * r}px) scaleX(${t.flip ? -1 : 1})`,
            maxWidth: 'none',
          }}
        />
      )}
    </div>
  );
}

export function MediaEditor({
  open,
  file,
  title,
  outputSize = 512,
  circular = true,
  renderPreviews,
  extra,
  finishLabel = 'Finish',
  onClose,
  onFinish,
}: MediaEditorProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [flip, setFlip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [PREVIEW, setPreview] = useState(DEFAULT_PREVIEW);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; oX: number; oY: number } | null>(null);

  // Measure to keep canvas square + fit on mobile
  useEffect(() => {
    if (!previewWrapRef.current || !open) return;
    const el = previewWrapRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = window.innerHeight * 0.5;
        const size = Math.max(180, Math.min(DEFAULT_PREVIEW, Math.floor(w), Math.floor(h)));
        setPreview(size);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // Load image
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFlip(false);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fitScale = useMemo(() => {
    if (!imgEl) return 1;
    return Math.max(PREVIEW / imgEl.naturalWidth, PREVIEW / imgEl.naturalHeight);
  }, [imgEl, PREVIEW]);

  const displayedW = imgEl ? imgEl.naturalWidth * fitScale * scale : PREVIEW;
  const displayedH = imgEl ? imgEl.naturalHeight * fitScale * scale : PREVIEW;
  const maxOffsetX = Math.max(0, (displayedW - PREVIEW) / 2);
  const maxOffsetY = Math.max(0, (displayedH - PREVIEW) / 2);
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, oX: offset.x, oY: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: clamp(dragRef.current.oX + dx, maxOffsetX),
      y: clamp(dragRef.current.oY + dy, maxOffsetY),
    });
  };
  const onPointerUp = () => { dragRef.current = null; };

  useEffect(() => {
    setOffset((o) => ({ x: clamp(o.x, maxOffsetX), y: clamp(o.y, maxOffsetY) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, fitScale]);

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFlip(false);
  };

  const exportBlob = async (): Promise<MediaEditorResult | null> => {
    if (!imgEl || !file) return null;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const ratio = outputSize / PREVIEW;
    const w = displayedW * ratio;
    const h = displayedH * ratio;
    const cx = outputSize / 2 + offset.x * ratio;
    const cy = outputSize / 2 + offset.y * ratio;

    ctx.save();
    if (flip) {
      ctx.translate(outputSize, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(imgEl, outputSize - cx - w / 2, cy - h / 2, w, h);
    } else {
      ctx.drawImage(imgEl, cx - w / 2, cy - h / 2, w, h);
    }
    ctx.restore();

    // Preserve animation if user did not touch the image (GIF/APNG only)
    const isAnimated = /gif|apng/i.test(file.type);
    if (isAnimated && scale === 1 && offset.x === 0 && offset.y === 0 && !flip) {
      return {
        blob: file,
        mime: file.type || 'image/gif',
        ext: file.name.split('.').pop()?.toLowerCase() || 'gif',
      };
    }

    const mime = 'image/png';
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), mime, 1)
    );
    return { blob, mime, ext: 'png' };
  };

  const handleFinish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const out = await exportBlob();
      if (out) onFinish(out);
    } finally {
      setBusy(false);
    }
  };

  const t: EditorTransform = {
    src: src ?? '',
    displayedW,
    displayedH,
    offsetX: offset.x,
    offsetY: offset.y,
    flip,
    PREVIEW,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'p-0 overflow-hidden border-border/60 [&>button]:hidden',
          'sm:max-w-[1040px] sm:w-[95vw] sm:max-h-[92dvh]',
          'max-sm:w-screen max-sm:max-w-none max-sm:h-[100dvh] max-sm:rounded-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:left-0 max-sm:top-0'
        )}
      >
        <div className="flex flex-col md:grid md:grid-cols-[1fr_320px] h-full max-h-[92dvh] max-sm:max-h-[100dvh] overflow-hidden">
          {/* LEFT — canvas */}
          <div className="relative flex flex-col p-4 sm:p-6 border-b md:border-b-0 md:border-r border-border/40 min-h-0">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                onClick={reset}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Reset"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div ref={previewWrapRef} className="flex-1 min-h-0 flex items-center justify-center">
              <div
                className={cn(
                  'relative overflow-hidden bg-[conic-gradient(at_50%_50%,_#0000_25%,_#ffffff10_0_50%,_#0000_0_75%,_#ffffff10_0)] bg-[length:16px_16px] border border-border/60 select-none',
                  circular ? 'rounded-full' : 'rounded-md',
                  'cursor-grab active:cursor-grabbing'
                )}
                style={{ width: PREVIEW, height: PREVIEW, touchAction: 'none' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {src && imgEl && (
                  <img
                    src={src}
                    alt="edit"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: displayedW,
                      height: displayedH,
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scaleX(${flip ? -1 : 1})`,
                      maxWidth: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              <Move className="w-3 h-3 inline mr-1 -mt-0.5" />
              Drag image to reposition
            </p>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setFlip((f) => !f)}
                className={cn(
                  'p-2 rounded-md border border-border/60 text-muted-foreground hover:text-foreground transition-colors',
                  flip && 'text-primary border-primary/60'
                )}
                title="Flip horizontally"
              >
                <FlipHorizontal2 className="w-4 h-4" />
              </button>
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <Slider
                  min={1}
                  max={4}
                  step={0.01}
                  value={[scale]}
                  onValueChange={(v) => setScale(v[0] ?? 1)}
                />
              </div>
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* RIGHT — previews + extras + finish */}
          <div className="flex flex-col p-4 sm:p-5 gap-4 sm:gap-5 overflow-y-auto min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {renderPreviews && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Preview
                </h3>
                <div className="flex flex-wrap items-end gap-3">{renderPreviews(t)}</div>
              </div>
            )}

            {extra}

            <div className="flex-1" />

            <Button onClick={handleFinish} disabled={busy} className="w-full">
              {busy ? 'Processing…' : finishLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
