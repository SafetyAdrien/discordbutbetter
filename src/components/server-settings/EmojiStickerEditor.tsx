import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, RotateCcw, ZoomIn, ZoomOut, Move, FlipHorizontal2 } from 'lucide-react';
import { useServers } from '@/hooks/useServers';
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
const sanitize = (n: string) =>
  n.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'item';

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
    const mine = servers.filter(
      (s) => s.owner_id === user?.id || (s as any).secondary_owner_id === user?.id
    );
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
  const [busy, setBusy] = useState(false);
  const [PREVIEW, setPreview] = useState(DEFAULT_PREVIEW);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; oX: number; oY: number } | null>(null);
  const outputSize = type === 'emoji' ? 320 : 512;

  // Measure available width to keep the canvas square and fit on mobile
  useEffect(() => {
    if (!previewWrapRef.current) return;
    const el = previewWrapRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = window.innerHeight * 0.5; // never exceed half the viewport height
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
    setName(defaultName);
    setServerId(currentServerId);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFlip(false);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, defaultName, currentServerId]);

  // "Cover" base scale so image always fills the preview at scale = 1
  const fitScale = useMemo(() => {
    if (!imgEl) return 1;
    return Math.max(PREVIEW / imgEl.naturalWidth, PREVIEW / imgEl.naturalHeight);
  }, [imgEl]);

  const displayedW = imgEl ? imgEl.naturalWidth * fitScale * scale : PREVIEW;
  const displayedH = imgEl ? imgEl.naturalHeight * fitScale * scale : PREVIEW;
  const maxOffsetX = Math.max(0, (displayedW - PREVIEW) / 2);
  const maxOffsetY = Math.max(0, (displayedH - PREVIEW) / 2);

  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

  // Drag handlers
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
    if (flip) {
      ctx.translate(outputSize, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(imgEl, outputSize - cx - w / 2, cy - h / 2, w, h);
    } else {
      ctx.drawImage(imgEl, cx - w / 2, cy - h / 2, w, h);
    }
    ctx.restore();

    // For PNG (lossless) or fallback. For gif/apng we can't preserve animation through canvas.
    const isAnimated = /gif|apng/i.test(file.type);
    if (isAnimated && scale === 1 && offset.x === 0 && offset.y === 0 && !flip) {
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
              transform: `translate(-50%, -50%) translate(${offset.x * r}px, ${offset.y * r}px) scaleX(${flip ? -1 : 1})`,
              maxWidth: 'none',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1040px] p-0 overflow-hidden border-border/60 [&>button]:hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px]">
          {/* LEFT — canvas */}
          <div className="relative flex flex-col p-6 border-r border-border/40">
            <div className="flex items-center justify-between mb-4">
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

            <div className="flex-1 flex items-center justify-center">
              <div
                className={cn(
                  'relative overflow-hidden bg-[conic-gradient(at_50%_50%,_#0000_25%,_#ffffff10_0_50%,_#0000_0_75%,_#ffffff10_0)] bg-[length:16px_16px] rounded-md border border-border/60 select-none',
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
                      imageRendering: 'auto',
                    }}
                  />
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              <Move className="w-3 h-3 inline mr-1 -mt-0.5" />
              Drag image to reposition
            </p>

            {/* Controls */}
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

          {/* RIGHT — settings */}
          <div className="flex flex-col p-5 gap-5">
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
              <Label htmlFor="es-name" className="text-xs">
                {type === 'emoji' ? 'Emoji' : 'Sticker'} name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="es-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pr-8"
                  maxLength={32}
                />
                {name && (
                  <button
                    onClick={() => setName('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Upload to <span className="text-destructive">*</span>
              </Label>
              <Select value={serverId} onValueChange={setServerId}>
                <SelectTrigger>
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
