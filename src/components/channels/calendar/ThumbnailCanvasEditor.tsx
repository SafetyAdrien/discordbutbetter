import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Lock, Unlock, RotateCcw, AlignCenter } from 'lucide-react';
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

type Transform = { tx: number; ty: number; tw: number; th: number };

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

  const constrainTransform = useCallback((next: Transform, keepRatio = locked): Transform => {
    if (!sourceBounds || !visibleBounds || !frameSize.w || !frameSize.h) return next;

    // Guard against degenerate dimensions (tiny / heavily-transparent sources).
    const safeVisibleW = Math.max(1, visibleBounds.width);
    const safeVisibleH = Math.max(1, visibleBounds.height);
    const safeSourceW = Math.max(1, sourceBounds.width);
    const safeSourceH = Math.max(1, sourceBounds.height);

    const sourceOffsetX = visibleBounds.x - sourceBounds.x;
    const sourceOffsetY = visibleBounds.y - sourceBounds.y;
    const centerSourceX = sourceOffsetX + visibleBounds.width / 2;
    const centerSourceY = sourceOffsetY + visibleBounds.height / 2;
    const originalScaleX = next.tw / safeSourceW;
    const originalScaleY = next.th / safeSourceH;
    const originalCenterX = next.tx + centerSourceX * originalScaleX;
    const originalCenterY = next.ty + centerSourceY * originalScaleY;

    // Hard caps: the visible rect must always fit fully inside the frame.
    const maxScaleX = frameSize.w / safeVisibleW;
    const maxScaleY = frameSize.h / safeVisibleH;
    // Minimum displayed visible size = 40px (matches the resize lower-bound).
    const minScaleX = 40 / safeVisibleW;
    const minScaleY = 40 / safeVisibleH;

    let scaleX = Math.max(minScaleX, Math.min(originalScaleX, maxScaleX));
    let scaleY = Math.max(minScaleY, Math.min(originalScaleY, maxScaleY));

    if (keepRatio) {
      // Snap both axes to the same fit factor relative to the original,
      // so the locked ratio cannot push either dimension out of the frame.
      const fitFactor = Math.min(
        scaleX / originalScaleX || 1,
        scaleY / originalScaleY || 1
      );
      scaleX = originalScaleX * fitFactor;
      scaleY = originalScaleY * fitFactor;
      // Re-clamp after ratio sync (in case rounding pushed us over).
      if (visibleBounds.width * scaleX > frameSize.w) {
        const k = frameSize.w / (visibleBounds.width * scaleX);
        scaleX *= k; scaleY *= k;
      }
      if (visibleBounds.height * scaleY > frameSize.h) {
        const k = frameSize.h / (visibleBounds.height * scaleY);
        scaleX *= k; scaleY *= k;
      }
    }

    // Final safety net: never exceed frame on either axis.
    if (visibleBounds.width * scaleX > frameSize.w) scaleX = maxScaleX;
    if (visibleBounds.height * scaleY > frameSize.h) scaleY = maxScaleY;

    const boundedTw = sourceBounds.width * scaleX;
    const boundedTh = sourceBounds.height * scaleY;
    let boundedTx = originalCenterX - centerSourceX * scaleX;
    let boundedTy = originalCenterY - centerSourceY * scaleY;

    const visibleW = visibleBounds.width * scaleX;
    const visibleH = visibleBounds.height * scaleY;
    const visibleLeft = boundedTx + sourceOffsetX * scaleX;
    const visibleTop = boundedTy + sourceOffsetY * scaleY;
    const maxLeft = Math.max(0, frameSize.w - visibleW);
    const maxTop = Math.max(0, frameSize.h - visibleH);
    const clampedLeft = Math.min(Math.max(visibleLeft, 0), maxLeft);
    const clampedTop = Math.min(Math.max(visibleTop, 0), maxTop);

    boundedTx += clampedLeft - visibleLeft;
    boundedTy += clampedTop - visibleTop;

    return { tx: boundedTx, ty: boundedTy, tw: boundedTw, th: boundedTh };
  }, [sourceBounds, visibleBounds, frameSize.w, frameSize.h, locked]);

  const applyTransform = useCallback((next: Transform, keepRatio = locked) => {
    const constrained = constrainTransform(next, keepRatio);
    setTx(constrained.tx);
    setTy(constrained.ty);
    setTw(constrained.tw);
    setTh(constrained.th);
  }, [constrainTransform, locked]);

  const resetTransform = useCallback(() => {
    if (!img || !sourceBounds || !frameSize.w) return;
    const coverScale = Math.max(
      frameSize.w / sourceBounds.width,
      frameSize.h / sourceBounds.height
    );
    const w = sourceBounds.width * coverScale;
    const h = sourceBounds.height * coverScale;
    applyTransform({ tx: (frameSize.w - w) / 2, ty: (frameSize.h - h) / 2, tw: w, th: h }, true);
  }, [img, sourceBounds, frameSize.w, frameSize.h, applyTransform]);

  const centerTransform = useCallback(() => {
    if (!img || !sourceBounds || !frameSize.w) return;
    // Default center option: fit the entire image inside the frame (contain)
    // so it is fully visible and perfectly centered, like a centered preview.
    const containScale = Math.min(
      frameSize.w / sourceBounds.width,
      frameSize.h / sourceBounds.height
    );
    const w = sourceBounds.width * containScale;
    const h = sourceBounds.height * containScale;
    applyTransform({ tx: (frameSize.w - w) / 2, ty: (frameSize.h - h) / 2, tw: w, th: h }, true);
  }, [img, sourceBounds, frameSize.w, frameSize.h, applyTransform]);

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
    const maxVisibleW = Math.max(1, Math.min(realMaxW, frameSize.w));
    const maxVisibleH = Math.max(1, Math.min(realMaxH, frameSize.h));

    if (d.mode === 'move') {
      applyTransform({ ...d.initial, tx: d.initial.tx + dx, ty: d.initial.ty + dy }, locked);
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
      applyTransform({
        tx: visibleCx - (sourceOffsetX + visibleBounds.width / 2) * nextScaleX,
        ty: visibleCy - (sourceOffsetY + visibleBounds.height / 2) * nextScaleY,
        tw: nw,
        th: nh,
      }, true);
    } else {
      // Unlocked: resize the real visible image freely, capped at real size.
      const visibleW = Math.min(Math.max(40, initialVisible.w + deltaW * 2), maxVisibleW);
      const visibleH = Math.min(Math.max(40, initialVisible.h + deltaH * 2), maxVisibleH);
      const nextScaleX = visibleW / visibleBounds.width;
      const nextScaleY = visibleH / visibleBounds.height;
      const nw = sourceBounds.width * nextScaleX;
      const nh = sourceBounds.height * nextScaleY;
      applyTransform({
        tx: visibleCx - (sourceOffsetX + visibleBounds.width / 2) * nextScaleX,
        ty: visibleCy - (sourceOffsetY + visibleBounds.height / 2) * nextScaleY,
        tw: nw,
        th: nh,
      }, false);
    }
  }, [img, sourceBounds, visibleBounds, locked, frameSize.w, frameSize.h, exportWidth, applyTransform]);

  const onPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* pointer capture may already be released */ }
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
    { key: 'nw', cls: 'top-0 left-0', cursor: 'cursor-nwse-resize' },
    { key: 'ne', cls: 'top-0 right-0', cursor: 'cursor-nesw-resize' },
    { key: 'sw', cls: 'bottom-0 left-0', cursor: 'cursor-nesw-resize' },
    { key: 'se', cls: 'bottom-0 right-0', cursor: 'cursor-nwse-resize' },
    { key: 'n',  cls: 'top-0 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
    { key: 's',  cls: 'bottom-0 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
    { key: 'w',  cls: 'left-0 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
    { key: 'e',  cls: 'right-0 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
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
            <div className="absolute inset-0 ring-2 ring-inset ring-primary/70 pointer-events-none" />
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
        <div className="flex gap-1 items-center">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={centerTransform}
            disabled={!img}
            title="Centrer l'image dans le cadre"
            aria-label="Centrer l'image dans le cadre"
            className="text-xs"
          >
            <AlignCenter className="w-4 h-4 mr-1.5" />
            Centrer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetTransform}
            disabled={!img}
            title="Réinitialiser le cadrage"
            aria-label="Réinitialiser le cadrage"
            className="text-xs"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Réinitialiser
          </Button>
        </div>
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
