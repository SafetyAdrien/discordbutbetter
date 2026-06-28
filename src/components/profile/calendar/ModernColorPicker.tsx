import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

type Format = 'Hex' | 'RGB' | 'HSL';

// ===== Color math =====
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ModernColorPicker({ value, onChange, className }: Props) {
  // Internal HSV state (h: 0-360, s: 0-1, v: 0-1)
  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(value);
    return rgbToHsv(r, g, b);
  });
  const [format, setFormat] = useState<Format>('Hex');
  const [formatOpen, setFormatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftInput, setDraftInput] = useState<string | null>(null);

  // Sync from external prop only when user is not actively dragging.
  const draggingRef = useRef(false);
  useEffect(() => {
    if (draggingRef.current) return;
    const { r, g, b } = hexToRgb(value);
    const next = rgbToHsv(r, g, b);
    setHsv((prev) => {
      // Preserve hue when external value is pure black/gray and hue would otherwise reset.
      if (next.s === 0 && prev.h !== 0) return { ...next, h: prev.h };
      return next;
    });
  }, [value]);

  const rgb = useMemo(() => {
    const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }, [hsv]);
  const hex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const emit = useCallback((nextHsv: { h: number; s: number; v: number }) => {
    const { r, g, b } = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    onChange(rgbToHex(r, g, b));
  }, [onChange]);

  // ===== SV pad =====
  const svRef = useRef<HTMLDivElement>(null);
  const handleSvMove = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setHsv((prev) => {
      const next = { h: prev.h, s: x, v: 1 - y };
      emit(next);
      return next;
    });
  }, [emit]);

  const startSvDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'none';
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleSvMove(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => handleSvMove(ev.clientX, ev.clientY);
    const up = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [handleSvMove]);

  // ===== Hue slider =====
  const hueRef = useRef<HTMLDivElement>(null);
  const handleHueMove = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHsv((prev) => {
      const next = { ...prev, h: x * 360 };
      emit(next);
      return next;
    });
  }, [emit]);

  const startHueDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'none';
    handleHueMove(e.clientX);
    const move = (ev: PointerEvent) => handleHueMove(ev.clientX);
    const up = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [handleHueMove]);

  // ===== Input field =====
  const displayValue = useMemo(() => {
    if (draftInput !== null) return draftInput;
    if (format === 'Hex') return hex.replace('#', '');
    if (format === 'RGB') return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    return `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
  }, [draftInput, format, hex, rgb, hsl]);

  const commitInput = (raw: string) => {
    const v = raw.trim();
    if (format === 'Hex') {
      const m = v.match(/^#?([0-9a-fA-F]{6})$/);
      if (m) {
        const { r, g, b } = hexToRgb(m[1]);
        const next = rgbToHsv(r, g, b);
        setHsv((prev) => (next.s === 0 ? { ...next, h: prev.h } : next));
        emit(next.s === 0 ? { ...next, h: hsv.h } : next);
      }
    } else if (format === 'RGB') {
      const parts = v.split(/[\s,]+/).map(Number);
      if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
        const next = rgbToHsv(parts[0], parts[1], parts[2]);
        setHsv(next);
        emit(next);
      }
    } else {
      const parts = v.replace(/%/g, '').split(/[\s,]+/).map(Number);
      if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
        // convert HSL -> RGB -> HSV
        const [h, s, l] = parts;
        const sn = s / 100, ln = l / 100;
        const c = (1 - Math.abs(2 * ln - 1)) * sn;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = ln - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        const rr = (r + m) * 255, gg = (g + m) * 255, bb = (b + m) * 255;
        const next = rgbToHsv(rr, gg, bb);
        setHsv(next);
        emit(next);
      }
    }
    setDraftInput(null);
  };

  const handleCopy = async () => {
    let text: string;
    if (format === 'Hex') text = hex;
    else if (format === 'RGB') text = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    else text = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;

  return (
    <div
      className={cn(
        'w-full min-w-0 rounded-2xl border border-border bg-card p-3 space-y-3 select-none',
        className,
      )}
    >
      {/* SV pad */}
      <div
        ref={svRef}
        onPointerDown={startSvDrag}
        className="relative w-full aspect-[4/3] rounded-lg overflow-hidden touch-none"
        style={{ backgroundColor: hueColor, cursor: 'crosshair' }}
      >
        {/* white -> transparent (saturation) */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))' }}
        />
        {/* transparent -> black (value) */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #000, rgba(0,0,0,0))' }}
        />
        {/* Crosshair reticle */}
        <div
          className="absolute w-5 h-5 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: hex,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={startHueDrag}
        className="relative w-full h-3 rounded-full touch-none"
        style={{
          background:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          cursor: 'pointer',
        }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] pointer-events-none"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
        />
      </div>

      {/* Bottom bar: swatch | value input | copy | format dropdown */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full border border-border shrink-0"
          style={{ backgroundColor: hex }}
        />
        <div className="flex-1 flex items-center gap-1 min-w-0">
          {format === 'Hex' && (
            <span className="text-muted-foreground font-mono text-sm">#</span>
          )}
          <input
            value={displayValue}
            onChange={(e) => setDraftInput(e.target.value)}
            onBlur={(e) => commitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-sm tracking-wide"
          />
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          aria-label="Copier la couleur"
          title="Copier"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFormatOpen((o) => !o)}
            onBlur={() => setTimeout(() => setFormatOpen(false), 120)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-border bg-background hover:bg-muted transition-colors"
          >
            {format}
            <ChevronDown className="w-3 h-3" />
          </button>
          {formatOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-md border border-border bg-popover shadow-md py-1 min-w-[80px]">
              {(['Hex', 'RGB', 'HSL'] as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFormat(f);
                    setDraftInput(null);
                    setFormatOpen(false);
                  }}
                  className={cn(
                    'block w-full text-left px-3 py-1 text-xs hover:bg-muted',
                    f === format && 'font-semibold text-primary',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
