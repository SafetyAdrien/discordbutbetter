import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Lock, Unlock, RotateCcw } from 'lucide-react';
import { findOpaqueBounds, sourceMayHaveTransparency, type OpaqueBounds } from './thumbnailAlpha';

interface Props {
  file: File;
  /** Aspect ratio width/height; defaults to 21/9 to match the card. */
  aspect?: number;
  /** Target export size in px (width). */
  exportWidth?: number;
  /** Keep the source frame intact instead of re-cropping transparent pixels. */
  preserveFrame?: boolean;
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
  aspect = 1,
  exportWidth = 1024,
  preserveFrame = false,
  onCancel,
  onConfirm,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [sourceBounds, setSourceBounds] = useState<OpaqueBounds | null>(null);
  const [visibleBounds, setVisibleBounds] = useState<OpaqueBounds | null>(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(true);

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
    setImg(null);
    setSourceBounds(null);
    setVisibleBounds(null);
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const fullBounds: OpaqueBounds = { x: 0, y: 0, width: im.naturalWidth, height: im.naturalHeight };
      let realBounds: OpaqueBounds = fullBounds;

      if (sourceMayHaveTransparency(file)) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = im.naturalWidth;
          canvas.height = im.naturalHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(im, 0, 0);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            realBounds = findOpaqueBounds(data.data, canvas.width, canvas.height, 1) ?? fullBounds;
          }
        } catch {
          realBounds = fullBounds;
        }
      }

      setSourceBounds(preserveFrame ? fullBounds : realBounds);
      setVisibleBounds(realBounds);
      setImg(im);
    };
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, preserveFrame]);

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

  const resetTransform = useCallback(() => {
    if (!img || !sourceBounds || !frameSize.w) return;
    const coverScale = Math.max(
      frameSize.w / sourceBounds.width,
      frameSize.h / sourceBounds.height
    );
    const w = sourceBounds.width * coverScale;
    const h = sourceBounds.height * coverScale;
    setTw(w);
    setTh(h);
    setTx((frameSize.w - w) / 2);
    setTy((frameSize.h - h) / 2);
  }, [img, sourceBounds, frameSize.w, frameSize.h]);

  // Initialize transform to match the day card rendering: the active source
  // rectangle covers the frame entirely (object-cover, centered). When editing
  // an already-saved thumbnail, the saved frame is preserved so reopening it
  // does not zoom/crop it differently from the calendar card.
  useEffect(() => {
    resetTransform();
  }, [resetTransform]);

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
    if (!d || !img || !sourceBounds || !visibleBounds || !frameSize.w) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const ratio = visibleBounds.width / visibleBounds.height;

    const initialScaleX = d.initial.tw / sourceBounds.width;
    const initialScaleY = d.initial.th / sourceBounds.height;
    const sourceOffsetX = visibleBounds.x - sourceBounds.x;
    const sourceOffsetY = visibleBounds.y - sourceBounds.y;
    const initialVisible = {
      x: d.initial.tx + sourceOffsetX * initialScaleX,
      y: d.initial.ty + sourceOffsetY * initialScaleY,
      w: visibleBounds.width * initialScaleX,
      h: visibleBounds.height * initialScaleY,
    };
    const visibleCx = initialVisible.x + initialVisible.w / 2;
    const visibleCy = initialVisible.y + initialVisible.h / 2;

    // Maximum displayed size in frame coordinates: never upscale the visible
    // imported image area beyond its real resolution (transparent padding is ignored).
    const realMaxW = Math.max(initialVisible.w, (visibleBounds.width * frameSize.w) / exportWidth);
    const realMaxH = Math.max(initialVisible.h, (visibleBounds.height * frameSize.w) / exportWidth);
    // Also cap so the symmetric resize keeps the visible rect inside the frame.
    const frameMaxW = 2 * Math.min(visibleCx, frameSize.w - visibleCx);
    const frameMaxH = 2 * Math.min(visibleCy, frameSize.h - visibleCy);
    const maxVisibleW = Math.max(40, Math.min(realMaxW, frameMaxW));
    const maxVisibleH = Math.max(40, Math.min(realMaxH, frameMaxH));

    const clampMove = (nx: number, ny: number) => {
      const sx = d.initial.tw / sourceBounds.width;
      const sy = d.initial.th / sourceBounds.height;
      const visLeft = nx + sourceOffsetX * sx;
      const visTop = ny + sourceOffsetY * sy;
      const visW = visibleBounds.width * sx;
      const visH = visibleBounds.height * sy;
      let cx = nx;
      let cy = ny;
      if (visW <= frameSize.w) {
        if (visLeft < 0) cx -= visLeft;
        else if (visLeft + visW > frameSize.w) cx -= (visLeft + visW - frameSize.w);
      }
      if (visH <= frameSize.h) {
        if (visTop < 0) cy -= visTop;
        else if (visTop + visH > frameSize.h) cy -= (visTop + visH - frameSize.h);
      }
      return { x: cx, y: cy };
    };

    if (d.mode === 'move') {
      const { x, y } = clampMove(d.initial.tx + dx, d.initial.ty + dy);
      setTx(x);
      setTy(y);
      return;
    }

    const h = d.handle!;
    let deltaW = 0, deltaH = 0;
    if (h.includes('e')) deltaW = dx;
    if (h.includes('w')) deltaW = -dx;
    if (h.includes('s')) deltaH = dy;
    if (h.includes('n')) deltaH = -dy;

    // Symmetric resize around the image center so the subject stays centered
    // regardless of which handle is dragged.
    if (locked) {
      // Locked: preserve the real visible image aspect ratio.
      const projW = (deltaW || deltaH * ratio) * 2;
      let visibleW = Math.min(Math.max(40, initialVisible.w + projW), maxVisibleW);
      let visibleH = visibleW / ratio;
      if (visibleH > maxVisibleH) {
        visibleH = maxVisibleH;
        visibleW = visibleH * ratio;
      }
      const nextScaleX = visibleW / visibleBounds.width;
      const nextScaleY = visibleH / visibleBounds.height;
      const nw = sourceBounds.width * nextScaleX;
      const nh = sourceBounds.height * nextScaleY;
      setTx(visibleCx - (sourceOffsetX + visibleBounds.width / 2) * nextScaleX);
      setTy(visibleCy - (sourceOffsetY + visibleBounds.height / 2) * nextScaleY);
      setTw(nw);
      setTh(nh);
    } else {
      // Unlocked: resize the real visible image freely, capped at real size.
      const visibleW = Math.min(Math.max(40, initialVisible.w + deltaW * 2), maxVisibleW);
      const visibleH = Math.min(Math.max(40, initialVisible.h + deltaH * 2), maxVisibleH);
      const nextScaleX = visibleW / visibleBounds.width;
      const nextScaleY = visibleH / visibleBounds.height;
      const nw = sourceBounds.width * nextScaleX;
      const nh = sourceBounds.height * nextScaleY;
      setTx(visibleCx - (sourceOffsetX + visibleBounds.width / 2) * nextScaleX);
      setTy(visibleCy - (sourceOffsetY + visibleBounds.height / 2) * nextScaleY);
      setTw(nw);
      setTh(nh);
    }
  }, [img, sourceBounds, visibleBounds, locked, frameSize.w, exportWidth]);

  const onPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!img || !sourceBounds || !frameSize.w) return;
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
      // Preserve transparency: export PNG when the source can contain alpha,
      // keeping the user's exact framing (no auto-crop) so what they see in
      // the preview matches the saved thumbnail pixel-for-pixel.
      const isTransparentSource = sourceMayHaveTransparency(file);
      if (!isTransparentSource) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.drawImage(
        img,
        sourceBounds.x,
        sourceBounds.y,
        sourceBounds.width,
        sourceBounds.height,
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

  const visibleRect = img && sourceBounds && visibleBounds && frameSize.w > 0 ? (() => {
    const scaleX = tw / sourceBounds.width;
    const scaleY = th / sourceBounds.height;
    return {
      left: tx + (visibleBounds.x - sourceBounds.x) * scaleX,
      top: ty + (visibleBounds.y - sourceBounds.y) * scaleY,
      width: visibleBounds.width * scaleX,
      height: visibleBounds.height * scaleY,
    };
  })() : null;

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-[hsl(var(--surface-1))] select-none"
        style={{ aspectRatio: String(aspect) }}
      >
        {img && sourceBounds && visibleRect && frameSize.w > 0 && (
          <>
          <div
            className="absolute overflow-hidden pointer-events-none"
            style={{
              left: tx,
              top: ty,
              width: tw,
              height: th,
            }}
          >
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none pointer-events-none"
              style={{
                left: -(sourceBounds.x * (tw / sourceBounds.width)),
                top: -(sourceBounds.y * (th / sourceBounds.height)),
                width: img.naturalWidth * (tw / sourceBounds.width),
                height: img.naturalHeight * (th / sourceBounds.height),
              }}
            />
          </div>
          <div
            className="absolute touch-none cursor-move"
            style={visibleRect}
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
          </>
        )}
        <div className="absolute inset-0 pointer-events-none ring-1 ring-border" />
      </div>
      <p className="text-xs text-muted-foreground">
        Déplacez l'image et utilisez les poignées pour la redimensionner. Le cadre représente la miniature finale. Activez le verrou pour conserver le ratio d'origine.
      </p>
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocked((v) => !v)}
          title={locked ? 'Déverrouiller les proportions' : 'Verrouiller les proportions'}
          aria-label={locked ? 'Déverrouiller les proportions' : 'Verrouiller les proportions'}
          className="text-xs"
        >
          {locked ? <Lock className="w-4 h-4 mr-1.5" /> : <Unlock className="w-4 h-4 mr-1.5" />}
          {locked ? 'Proportions verrouillées' : 'Proportions libres'}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            <X className="w-4 h-4 mr-1" /> Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={busy || !img}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  );
}
