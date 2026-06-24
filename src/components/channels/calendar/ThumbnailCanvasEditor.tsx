import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';

interface Props {
  file: File;
  /** Aspect ratio width/height; defaults to 21/9 to match the card. */
  aspect?: number;
  /** Target export size in px (width). */
  exportWidth?: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

type Handle =
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw'
  | null;

/**
 * Canvas-based thumbnail editor: drag to move, drag handles around the image
 * to resize. The image moves/scales inside a fixed aspect-ratio frame; the
 * exported blob is the visible portion of the frame.
 */
export function ThumbnailCanvasEditor({
  file,
  aspect = 21 / 9,
  exportWidth = 1680,
  onCancel,
  onConfirm,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);

  // Image transform (in frame px)
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [tw, setTw] = useState(0);
  const [th, setTh] = useState(0);

  // Pointer state
  const dragRef = useRef<{
    mode: 'move' | 'resize';
    handle: Handle;
    startX: number;
    startY: number;
    initial: { tx: number; ty: number; tw: number; th: number };
  } | null>(null);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Measure frame
  useEffect(() => {
    if (!frameRef.current) return;
    const el = frameRef.current;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = Math.round(w / aspect);
      setFrameSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  // Initialize transform: cover the frame
  useEffect(() => {
    if (!img || !frameSize.w) return;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const frameRatio = frameSize.w / frameSize.h;
    let w: number, h: number;
    if (imgRatio > frameRatio) {
      // image wider — match height
      h = frameSize.h;
      w = h * imgRatio;
    } else {
      w = frameSize.w;
      h = w / imgRatio;
    }
    setTw(w);
    setTh(h);
    setTx((frameSize.w - w) / 2);
    setTy((frameSize.h - h) / 2);
  }, [img, frameSize.w, frameSize.h]);

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize', handle: Handle = null) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initial: { tx, ty, tw, th },
    };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !img) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const ratio = img.naturalWidth / img.naturalHeight;

    if (d.mode === 'move') {
      setTx(d.initial.tx + dx);
      setTy(d.initial.ty + dy);
      return;
    }
    // Resize — keep aspect ratio of the image
    let { tx: nx, ty: ny, tw: nw, th: nh } = d.initial;
    const h = d.handle!;
    // Use dx as primary delta for horizontal handles, dy for vertical
    let deltaW = 0, deltaH = 0;
    if (h.includes('e')) deltaW = dx;
    if (h.includes('w')) deltaW = -dx;
    if (h.includes('s')) deltaH = dy;
    if (h.includes('n')) deltaH = -dy;
    // Choose dominant axis to preserve ratio
    const projW = deltaW || deltaH * ratio;
    const projH = projW / ratio;
    nw = Math.max(40, d.initial.tw + projW);
    nh = Math.max(40 / ratio, nw / ratio);
    // Anchor opposite side
    if (h.includes('w')) nx = d.initial.tx + (d.initial.tw - nw);
    if (h.includes('n')) ny = d.initial.ty + (d.initial.th - nh);
    setTx(nx); setTy(ny); setTw(nw); setTh(nh);
  }, [img]);

  const onPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!img || !frameSize.w) return;
    setBusy(true);
    try {
      const scale = exportWidth / frameSize.w;
      const outW = Math.round(exportWidth);
      const outH = Math.round(exportWidth / aspect);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      // Preserve transparency: export PNG when the source is PNG/WebP/AVIF/SVG.
      // For opaque sources (jpeg) we export jpeg to keep file sizes small.
      const isTransparentSource = /png|webp|avif|svg/i.test(file.type) || /\.(png|webp|avif|svg)$/i.test(file.name);
      if (!isTransparentSource) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.drawImage(
        img,
        Math.round(tx * scale),
        Math.round(ty * scale),
        Math.round(tw * scale),
        Math.round(th * scale)
      );
      const mime = isTransparentSource ? 'image/png' : 'image/jpeg';
      const quality = isTransparentSource ? undefined : 0.9;
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), mime, quality)
      );
      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  };

  const handles: { key: Exclude<Handle, null>; cls: string; cursor: string }[] = [
    { key: 'nw', cls: '-top-1.5 -left-1.5', cursor: 'cursor-nwse-resize' },
    { key: 'ne', cls: '-top-1.5 -right-1.5', cursor: 'cursor-nesw-resize' },
    { key: 'sw', cls: '-bottom-1.5 -left-1.5', cursor: 'cursor-nesw-resize' },
    { key: 'se', cls: '-bottom-1.5 -right-1.5', cursor: 'cursor-nwse-resize' },
    { key: 'n',  cls: '-top-1.5 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
    { key: 's',  cls: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
    { key: 'w',  cls: '-left-1.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
    { key: 'e',  cls: '-right-1.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
  ];

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-black/40 select-none"
        style={{ aspectRatio: String(aspect) }}
      >
        {img && frameSize.w > 0 && (
          <div
            className="absolute touch-none cursor-move"
            style={{
              left: tx,
              top: ty,
              width: tw,
              height: th,
              backgroundImage: `url(${img.src})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
            onPointerDown={(e) => onPointerDown(e, 'move')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Outline */}
            <div className="absolute inset-0 ring-2 ring-primary/70 pointer-events-none" />
            {/* Handles */}
            {handles.map((h) => (
              <button
                type="button"
                key={h.key}
                aria-label={`Redimensionner ${h.key}`}
                onPointerDown={(e) => onPointerDown(e, 'resize', h.key)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`absolute w-3 h-3 rounded-sm bg-primary border border-primary-foreground/80 ${h.cls} ${h.cursor} touch-none`}
              />
            ))}
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none ring-1 ring-border" />
      </div>
      <p className="text-xs text-muted-foreground">
        Déplacez l'image et utilisez les poignées pour la redimensionner. Le cadre représente la miniature finale.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          <X className="w-4 h-4 mr-1" /> Annuler
        </Button>
        <Button onClick={handleConfirm} disabled={busy || !img}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          Appliquer
        </Button>
      </div>
    </div>
  );
}
