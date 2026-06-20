import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X, RotateCcw, FlipHorizontal2, ZoomOut, ZoomIn, RotateCw } from 'lucide-react';
import { useServers, type ServerWithDetails } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export interface EditorResult {
  blob: Blob;
  name: string;
  serverId: string;
  mime: string;
  ext: string;
}

interface EmojiStickerEditorProps {
  open: boolean;
  file: File | null;
  defaultName: string;
  type: 'emoji' | 'sticker';
  currentServerId: string;
  onClose: () => void;
  onFinish: (result: EditorResult) => void;
}

const DEFAULT_PREVIEW = 380;
const MOBILE_PREVIEW = 196;
const MOBILE_LANDSCAPE_PREVIEW = 136;
const MIN_PREVIEW = 56;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const MOBILE_CANVAS_PANEL_MIN = 220;
const MOBILE_CANVAS_PANEL_MAX = 356;

const getInitialPreview = () => {
  if (typeof window === 'undefined') return DEFAULT_PREVIEW;
  const viewportW = window.visualViewport?.width ?? window.innerWidth;
  const viewportH = window.visualViewport?.height ?? window.innerHeight;
  const isMobile = viewportW < 768 || viewportH < 520;
  if (!isMobile) return DEFAULT_PREVIEW;
  const isLandscape = viewportW > viewportH;
  const hardCap = isLandscape ? MOBILE_LANDSCAPE_PREVIEW : MOBILE_PREVIEW;
  return Math.max(MIN_PREVIEW, Math.min(hardCap, Math.floor(viewportW * 0.48), Math.floor(viewportH * 0.26)));
};

const clampScale = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const pointDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const sanitize = (n: string) =>
  n.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'item';

const getCanvasPanelBounds = (viewportW: number, viewportH: number) => {
  const max = Math.max(MOBILE_CANVAS_PANEL_MIN, Math.min(MOBILE_CANVAS_PANEL_MAX, Math.floor(viewportH - 230)));
  const min = Math.min(MOBILE_CANVAS_PANEL_MIN, max);
  const defaultHeight = clampNumber(Math.floor(Math.min(viewportH * 0.46, viewportW * 0.86)), min, max);
  return { min, max, defaultHeight };
};

export function EmojiStickerEditor({
  open,
  file,
  defaultName,
  type,
  currentServerId,
  onClose,
  onFinish,
}: EmojiStickerEditorProps) {
  const { user } = useAuth();
  const { data: servers = [] } = useServers();

  const manageable = useMemo(() => {
    const mine = servers.filter((s: ServerWithDetails) => s.owner_id === user?.id || s.secondary_owner_id === user?.id);
    if (!mine.some((s) => s.id === currentServerId)) {
      const cur = servers.find((s) => s.id === currentServerId);
      if (cur) mine.unshift(cur);
    }
    return mine;
  }, [servers, user, currentServerId]);

  const [src, setSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState(defaultName);
  const [serverId, setServerId] = useState(currentServerId);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [flip, setFlip] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [rotationMode, setRotationMode] = useState<'free' | 'step'>('step');
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [busy, setBusy] = useState(false);
  const [PREVIEW, setPreview] = useState(getInitialPreview);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [canvasPanelHeight, setCanvasPanelHeight] = useState<number | null>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; oX: number; oY: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);
  
  const panelResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const outputSize = type === 'emoji' ? 320 : 512;

  // Measure to keep canvas square + physically contained on mobile browsers.
  useEffect(() => {
    if (!previewWrapRef.current || !open) return;
    const el = previewWrapRef.current;
    let raf = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const viewportW = window.visualViewport?.width ?? window.innerWidth;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const isMobile = viewportW < 768 || viewportH < 520;
      const isLandscape = viewportW > viewportH;
      const panelBounds = getCanvasPanelBounds(viewportW, viewportH);
      setCanvasPanelHeight((prev) => clampNumber(prev ?? panelBounds.defaultHeight, panelBounds.min, panelBounds.max));
      const mobileMax = isLandscape
        ? Math.min(MOBILE_LANDSCAPE_PREVIEW, Math.floor(viewportH * 0.4), Math.floor(viewportW * 0.26))
        : Math.min(MOBILE_PREVIEW, Math.floor(viewportW * 0.48), Math.floor(viewportH * 0.26));
      const safeW = Math.max(MIN_PREVIEW, isLandscape ? viewportW - 308 : viewportW - 104);
      const viewportLimitedH = isMobile ? Math.max(MIN_PREVIEW, (canvasPanelHeight ?? panelBounds.defaultHeight) - 96) : DEFAULT_PREVIEW;
      const w = isMobile ? Math.min(rect.width || safeW, safeW) : rect.width;
      const h = isMobile ? viewportLimitedH : rect.height;
      if (w <= 0) return;
      const size = Math.max(
        MIN_PREVIEW,
        Math.min(DEFAULT_PREVIEW, isMobile ? mobileMax : DEFAULT_PREVIEW, Math.floor(w), Math.floor(h))
      );
      setPreview(size);
      setViewportHeight((prev) => {
        const next = Math.max(240, Math.floor(viewportH));
        return prev === next ? prev : next;
      });
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    scheduleMeasure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);
    window.visualViewport?.addEventListener('scroll', scheduleMeasure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
      window.visualViewport?.removeEventListener('scroll', scheduleMeasure);
    };
  }, [open, canvasPanelHeight]);

  // Load image
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setName(defaultName);
    setServerId(currentServerId);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFlip(false);
    setRotation(0);
    setFitMode('fit');
    pointersRef.current.clear();
    pinchRef.current = null;
    
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, defaultName, currentServerId]);

  // Base scale depends on fit mode: fit = whole image visible, fill = image covers preview
  const fitScale = useMemo(() => {
    if (!imgEl) return 1;
    const sx = PREVIEW / imgEl.naturalWidth;
    const sy = PREVIEW / imgEl.naturalHeight;
    return fitMode === 'fit' ? Math.min(sx, sy) : Math.max(sx, sy);
  }, [imgEl, PREVIEW, fitMode]);

  const displayedW = imgEl ? imgEl.naturalWidth * fitScale * scale : PREVIEW;
  const displayedH = imgEl ? imgEl.naturalHeight * fitScale * scale : PREVIEW;
  const maxOffsetX = Math.max(0, (displayedW - PREVIEW) / 2);
  const maxOffsetY = Math.max(0, (displayedH - PREVIEW) / 2);

  // Discord-style clamping: image edges cannot leave canvas edges.
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

  // Drag, pinch and direct in-canvas scale handlers
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = Array.from(pointersRef.current.values());
    if (points.length >= 2) {
      pinchRef.current = { startDistance: pointDistance(points[0], points[1]), startScale: scale };
      dragRef.current = null;
      return;
    }
    dragRef.current = { startX: e.clientX, startY: e.clientY, oX: offset.x, oY: offset.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const points = Array.from(pointersRef.current.values());
    if (points.length >= 2 && pinchRef.current) {
      const distance = pointDistance(points[0], points[1]);
      if (pinchRef.current.startDistance > 0) {
        setScale(clampScale(pinchRef.current.startScale * (distance / pinchRef.current.startDistance)));
      }
      return;
    }
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: clamp(dragRef.current.oX + dx, maxOffsetX),
      y: clamp(dragRef.current.oY + dy, maxOffsetY),
    });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
    dragRef.current = null;
    const [remaining] = Array.from(pointersRef.current.values());
    if (remaining) {
      dragRef.current = { startX: remaining.x, startY: remaining.y, oX: offset.x, oY: offset.y };
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setScale((value) => clampScale(value * (e.deltaY < 0 ? 1.06 : 0.94)));
  };


  const onPanelResizePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (typeof window === 'undefined') return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const viewportW = window.visualViewport?.width ?? window.innerWidth;
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const { defaultHeight } = getCanvasPanelBounds(viewportW, viewportH);
    panelResizeRef.current = { startY: e.clientY, startHeight: canvasPanelHeight ?? defaultHeight };
  };

  const onPanelResizePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!panelResizeRef.current || typeof window === 'undefined') return;
    e.preventDefault();
    e.stopPropagation();
    const viewportW = window.visualViewport?.width ?? window.innerWidth;
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const { min, max } = getCanvasPanelBounds(viewportW, viewportH);
    setCanvasPanelHeight(clampNumber(panelResizeRef.current.startHeight + e.clientY - panelResizeRef.current.startY, min, max));
  };

  const onPanelResizePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    panelResizeRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  // Re-clamp when scale changes
  useEffect(() => {
    setOffset((o) => ({ x: clamp(o.x, maxOffsetX), y: clamp(o.y, maxOffsetY) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, fitScale]);

  // Render to canvas → blob
  const exportBlob = async (): Promise<EditorResult | null> => {
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
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(imgEl, -w / 2, -h / 2, w, h);
    ctx.restore();

    // For PNG (lossless) or fallback. For gif/apng we can't preserve animation through canvas.
    const isAnimated = /gif|apng/i.test(file.type);
    if (isAnimated && fitMode === 'fit' && scale === 1 && offset.x === 0 && offset.y === 0 && !flip && rotation === 0) {
      // Untouched: preserve original animation
      return {
        blob: file,
        name: sanitize(name),
        serverId,
        mime: file.type || 'image/gif',
        ext: file.name.split('.').pop()?.toLowerCase() || 'gif',
      };
    }
    const mime = 'image/png';
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), mime, 1)
    );
    return { blob, name: sanitize(name), serverId, mime, ext: 'png' };
  };

  const handleFinish = async () => {
    if (busy || !name.trim() || !serverId) return;
    setBusy(true);
    try {
      const out = await exportBlob();
      if (out) onFinish(out);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFlip(false);
    setRotation(0);
    setFitMode('fit');
  };

  // Live preview thumbnails — render via small inline canvas using same transform
  const PreviewBox = ({ size, rounded }: { size: number; rounded: boolean }) => {
    const r = size / PREVIEW;
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          rounded ? 'rounded-md' : 'rounded'
        )}
        style={{ width: size, height: size }}
      >
        {src && imgEl && (
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              width: displayedW * r,
              height: displayedH * r,
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${offset.x * r}px, ${offset.y * r}px) rotate(${rotation}deg) scaleX(${flip ? -1 : 1})`,
              maxWidth: 'none',
            }}
          />
        )}
      </div>
    );
  };
  const mobileViewportStyle = viewportHeight
    ? ({ '--media-editor-vh': `${viewportHeight}px`, maxHeight: `${viewportHeight}px` } as CSSProperties)
    : undefined;
  const canvasPanelStyle = {
    '--media-canvas-panel-h': `${canvasPanelHeight ?? MOBILE_CANVAS_PANEL_MAX}px`,
  } as CSSProperties;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        style={mobileViewportStyle}
        className={cn(
          'p-0 gap-0 overflow-hidden border-border/60 [&>button]:hidden',
          'sm:max-w-[1040px] sm:w-[95vw] sm:max-h-[92dvh]',
          'max-sm:w-screen max-sm:max-w-none max-sm:h-[var(--media-editor-vh,100svh)] max-sm:max-h-[var(--media-editor-vh,100svh)] max-sm:rounded-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:left-0 max-sm:top-0',
          '[@media(max-height:520px)]:w-screen [@media(max-height:520px)]:max-w-none [@media(max-height:520px)]:h-[var(--media-editor-vh,100dvh)] [@media(max-height:520px)]:max-h-[var(--media-editor-vh,100dvh)] [@media(max-height:520px)]:rounded-none [@media(max-height:520px)]:translate-x-0 [@media(max-height:520px)]:translate-y-0 [@media(max-height:520px)]:left-0 [@media(max-height:520px)]:top-0'
        )}
      >
        <DialogTitle className="sr-only">Add {type === 'emoji' ? 'Emoji' : 'Sticker'}</DialogTitle>
          <div className="flex flex-col md:grid md:grid-cols-[1fr_320px] h-full max-h-[92dvh] max-sm:max-h-[var(--media-editor-vh,100svh)] [@media(max-height:520px)]:max-h-[var(--media-editor-vh,100dvh)] [@media(max-height:520px)]:flex-row overflow-hidden">
          {/* LEFT — canvas */}
          <div style={canvasPanelStyle} className="relative flex flex-col flex-none md:flex-none p-3 sm:p-6 border-b md:border-b-0 md:border-r border-border/40 min-h-0 min-w-0 overflow-hidden max-sm:h-[var(--media-canvas-panel-h)] max-sm:max-h-[var(--media-canvas-panel-h)] [@media(max-height:520px)]:w-[40vw] [@media(max-height:520px)]:h-full [@media(max-height:520px)]:max-h-none [@media(max-height:520px)]:border-b-0 [@media(max-height:520px)]:border-r">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold">
                Add {type === 'emoji' ? 'Emoji' : 'Sticker'}
              </h2>
              <button
                onClick={reset}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Reset"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div ref={previewWrapRef} className="flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-visible pt-8">
              <div
                className={cn(
                  'relative rounded-md border border-border/60 bg-muted/40 select-none',
                  'cursor-grab active:cursor-grabbing'
                )}
                style={{ width: PREVIEW, height: PREVIEW, touchAction: 'none' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
              >
                <div
                  className={cn(
                    'absolute inset-0 overflow-hidden rounded-full bg-[conic-gradient(at_50%_50%,_#0000_25%,_#ffffff10_0_50%,_#0000_0_75%,_#ffffff10_0)] bg-[length:16px_16px] ring-1 ring-inset ring-border/60'
                  )}
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
                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scaleX(${flip ? -1 : 1})`,
                        maxWidth: 'none',
                        pointerEvents: 'none',
                        imageRendering: 'auto',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Discord-style zoom slider */}
            <div className="flex items-center gap-3 mt-3 px-1">
              <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Slider
                value={[scale]}
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.01}
                onValueChange={(v) => setScale(clampScale(v[0] ?? 1))}
                aria-label="Zoom"
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            {/* Rotation control with mode toggle */}
            <div className="mt-3 px-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Rotation</span>
                <div className="flex items-center rounded-md border border-border/60 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setRotationMode('step')}
                    className={cn(
                      'px-2 py-1 transition-colors',
                      rotationMode === 'step' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    90°
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotationMode('free')}
                    className={cn(
                      'px-2 py-1 transition-colors',
                      rotationMode === 'free' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    360°
                  </button>
                </div>
              </div>
              {rotationMode === 'free' ? (
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Slider
                    value={[rotation]}
                    min={-180}
                    max={180}
                    step={1}
                    onValueChange={(v) => setRotation(v[0] ?? 0)}
                    aria-label="Rotation"
                    className="flex-1"
                  />
                  <RotateCw className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{rotation}°</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setRotation(deg > 180 ? deg - 360 : deg)}
                      className={cn(
                        'h-8 rounded-md border border-border/60 text-xs font-medium transition-colors',
                        ((rotation + 360) % 360) === deg
                          ? 'bg-primary text-primary-foreground border-primary/60'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              )}
            </div>




            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-2 sm:mt-4 min-w-0">
              <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
                <button
                  onClick={() => setFitMode('fit')}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium transition-colors',
                    fitMode === 'fit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Fit entire image"
                  aria-label="Fit entire image"
                >
                  Fit
                </button>
                <button
                  onClick={() => setFitMode('fill')}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium transition-colors',
                    fitMode === 'fill' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Fill canvas"
                  aria-label="Fill canvas"
                >
                  Fill
                </button>
              </div>
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
            </div>
            <button
              type="button"
              aria-label="Resize canvas area height"
              title="Resize canvas area height"
              className="mx-auto mt-2 hidden h-5 w-24 shrink-0 touch-none items-center justify-center rounded-full text-muted-foreground max-sm:flex [@media(max-height:520px)]:hidden"
              onPointerDown={onPanelResizePointerDown}
              onPointerMove={onPanelResizePointerMove}
              onPointerUp={onPanelResizePointerUp}
              onPointerCancel={onPanelResizePointerUp}
            >
              <span className="h-1 w-12 rounded-full bg-muted-foreground/50" />
            </button>
          </div>

          {/* RIGHT — settings */}
          <div className="flex flex-col flex-1 md:flex-none p-3 sm:p-5 gap-3 sm:gap-5 overflow-y-auto min-h-0 max-h-none md:max-h-none shrink pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="space-y-1.5">
              <Label htmlFor="es-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nom {type === 'emoji' ? "de l'emoji" : 'du sticker'} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="es-name"
                  aria-label={type === 'emoji' ? "Renommer l'emoji personnalisé" : 'Renommer le sticker personnalisé'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 pr-10 text-base sm:text-sm"
                  maxLength={32}
                  autoComplete="off"
                  inputMode="text"
                />
                {name && (
                  <button
                    type="button"
                    onClick={() => setName('')}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    aria-label="Clear name"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Preview
              </Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/40">
                  <PreviewBox size={24} rounded />
                  <span className="text-xs font-medium text-muted-foreground">6</span>
                </div>
                <div className="p-2 rounded-md bg-muted/40">
                  <PreviewBox size={48} rounded />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Serveur de destination <span className="text-destructive">*</span>
              </Label>
              <Select value={serverId} onValueChange={setServerId}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {manageable.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        {s.icon_url ? (
                          <img src={s.icon_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-[10px] font-bold flex items-center justify-center">
                            {s.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm">{s.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <Button
              onClick={handleFinish}
              disabled={busy || !name.trim() || !serverId}
              className="w-full"
            >
              {busy ? 'Processing…' : 'Finish'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
