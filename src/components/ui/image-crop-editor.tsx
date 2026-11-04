import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, RotateCw } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/*
 * "Modifier l'image" de Discord : cadre blanc fixe au format voulu sur fond
 * sombre, image deplacable a la souris, curseur de zoom entre deux icones,
 * rotation par quart de tour, puis "Reinitialiser / Annuler / Appliquer".
 */

interface ImageCropEditorProps {
  open: boolean;
  file: File | null;
  /** Largeur / hauteur du cadre (2,5 pour une couverture d'evenement). */
  aspect: number;
  /** Largeur de l'image produite (la hauteur suit le format). */
  outputWidth?: number;
  onClose: () => void;
  onApply: (blob: Blob, previewUrl: string) => void;
}

const VIEW_W = 516;
const VIEW_H = 420;
const FRAME_PAD = 4;

export function ImageCropEditor({ open, file, aspect, outputWidth = 1200, onClose, onApply }: ImageCropEditorProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };
  useEffect(reset, [file]);

  const frameW = VIEW_W - FRAME_PAD * 2;
  const frameH = Math.min(frameW / aspect, VIEW_H - 40);
  const realFrameW = frameH * aspect;

  // Taille de l'image affichee : couvre le cadre a zoom 1 (en tenant compte de la rotation).
  const rotated = rotation % 180 !== 0;
  const natW = img ? (rotated ? img.naturalHeight : img.naturalWidth) : 1;
  const natH = img ? (rotated ? img.naturalWidth : img.naturalHeight) : 1;
  const baseScale = Math.max(realFrameW / natW, frameH / natH);
  const scale = baseScale * zoom;
  const dispW = natW * scale;
  const dispH = natH * scale;

  // L'image ne doit jamais laisser de vide dans le cadre.
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.max(-(dispW - realFrameW) / 2, Math.min((dispW - realFrameW) / 2, o.x)),
    y: Math.max(-(dispH - frameH) / 2, Math.min((dispH - frameH) / 2, o.y)),
  });
  const pos = clamp(offset);

  const apply = () => {
    if (!img) return;
    const outW = outputWidth;
    const outH = Math.round(outputWidth / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const k = outW / realFrameW;
    ctx.translate(outW / 2 + pos.x * k, outH / 2 + pos.y * k);
    ctx.rotate((rotation * Math.PI) / 180);
    const w = img.naturalWidth * scale * k;
    const h = img.naturalHeight * scale * k;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) onApply(blob, URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[576px] p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6">
          <DialogTitle className="text-xl font-semibold text-white">Modifier l'image</DialogTitle>
          <DialogDescription className="sr-only">Déplace et zoome l'image pour la cadrer.</DialogDescription>
        </div>
        <div className="px-6 pt-5">
          <div
            className="relative mx-auto rounded-lg bg-[hsl(var(--card))] overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
            style={{ width: VIEW_W, maxWidth: '100%', height: VIEW_H }}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
            }}
            onPointerUp={() => (drag.current = null)}
            onWheel={(e) => setZoom((z) => Math.min(3, Math.max(1, z - e.deltaY * 0.002)))}
          >
            {src && (
              <img
                src={src}
                alt=""
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none pointer-events-none opacity-40"
                style={{
                  width: (img?.naturalWidth ?? 0) * scale,
                  height: (img?.naturalHeight ?? 0) * scale,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${rotation}deg)`,
                }}
              />
            )}
            {/* Cadre : l'image y apparait en pleine opacite */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden outline outline-[5px] outline-white pointer-events-none"
              style={{ width: realFrameW, height: frameH }}
            >
              {src && (
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    width: (img?.naturalWidth ?? 0) * scale,
                    height: (img?.naturalHeight ?? 0) * scale,
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${rotation}deg)`,
                  }}
                />
              )}
            </div>
          </div>
          <div className="relative mt-5 flex items-center justify-center gap-3">
            <ImageIcon className="w-3.5 h-3.5 text-[hsl(var(--icon-default))]" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="w-[150px] accent-white"
            />
            <ImageIcon className="w-6 h-6 text-[hsl(var(--icon-default))]" />
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Faire pivoter"
              className="absolute right-0 p-1 text-[hsl(var(--icon-default))] hover:text-white"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="mt-6 px-6 pb-6 flex items-center">
          <button type="button" onClick={reset} className="text-sm font-medium text-[hsl(var(--text-link))] hover:underline">
            Réinitialiser
          </button>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button onClick={apply} disabled={!img}>Appliquer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
