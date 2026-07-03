/**
 * HsvColorPicker — pointer-driven Saturation/Value square + Hue slider.
 * No React state on drag: coordinates are read from refs and pushed to the
 * onChange callback which is already rAF-throttled downstream in the theme
 * store, so dragging stays 60fps even on mid-range hardware.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface HsvColorPickerProps {
  hex: string;
  onChange: (hex: string) => void;
  onCommit?: (hex: string) => void;
  className?: string;
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = h * 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = v - c;
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function HsvColorPicker({ hex, onChange, onCommit, className }: HsvColorPickerProps) {
  const svRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<'sv' | 'hue' | null>(null);

  const [hsv, setHsv] = useState(() => hexToHsv(hex));
  const hsvRef = useRef(hsv);

  useEffect(() => {
    hsvRef.current = hsv;
  }, [hsv]);

  // Sync from external hex changes (e.g. hex input, chip switch) — but not
  // while the user is actively dragging.
  useEffect(() => {
    if (draggingRef.current) return;
    const next = hexToHsv(hex);
    hsvRef.current = next;
    setHsv(next);
  }, [hex]);

  const emit = useCallback((h: number, s: number, v: number, commit: boolean) => {
    const next = hsvToHex(h, s, v);
    onChange(next);
    if (commit) onCommit?.(next);
  }, [onChange, onCommit]);

  const onSvPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    draggingRef.current = 'sv';
    updateSv(e.clientX, e.clientY, false);
  };
  const updateSv = (clientX: number, clientY: number, commit: boolean) => {
    const el = svRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp01((clientX - rect.left) / rect.width);
    const v = 1 - clamp01((clientY - rect.top) / rect.height);
    const next = { ...hsvRef.current, s, v };
    hsvRef.current = next;
    setHsv(next);
    emit(next.h, s, v, commit);
  };
  const onSvPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== 'sv') return;
    updateSv(e.clientX, e.clientY, false);
  };
  const onSvPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== 'sv') return;
    draggingRef.current = null;
    updateSv(e.clientX, e.clientY, true);
  };

  const onHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    draggingRef.current = 'hue';
    updateHue(e.clientX, false);
  };
  const updateHue = (clientX: number, commit: boolean) => {
    const el = hueRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = clamp01((clientX - rect.left) / rect.width) * 360;
    const next = { ...hsvRef.current, h };
    hsvRef.current = next;
    setHsv(next);
    emit(h, next.s, next.v, commit);
  };
  const onHuePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== 'hue') return;
    updateHue(e.clientX, false);
  };
  const onHuePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== 'hue') return;
    draggingRef.current = null;
    updateHue(e.clientX, true);
  };

  const hueBg = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
  const svBaseColor = hsvToHex(hsv.h, 1, 1);

  return (
    <div className={cn('space-y-2.5 select-none', className)}>
      {/* SV square */}
      <div
        ref={svRef}
        role="slider"
        aria-label="Saturation / Luminosité"
        aria-valuenow={Math.round(hsv.s * 100)}
        onPointerDown={onSvPointerDown}
        onPointerMove={onSvPointerMove}
        onPointerUp={onSvPointerUp}
        onPointerCancel={onSvPointerUp}
        className="discord-hsv-square relative w-full aspect-[7/4] overflow-hidden touch-none cursor-crosshair"
        style={{ background: svBaseColor }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #000000, transparent)' }}
        />
        <div
          aria-hidden
          className="discord-hsv-thumb absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: hex,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        role="slider"
        aria-label="Teinte"
        aria-valuenow={Math.round(hsv.h)}
        onPointerDown={onHuePointerDown}
        onPointerMove={onHuePointerMove}
        onPointerUp={onHuePointerUp}
        onPointerCancel={onHuePointerUp}
        className="discord-hue-slider relative w-full touch-none cursor-pointer"
        style={{ background: hueBg }}
      >
        <div
          aria-hidden
          className="discord-hue-thumb absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }}
        />
      </div>
    </div>
  );
}
