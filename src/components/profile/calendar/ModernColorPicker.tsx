import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return { h: 0, s: 0, l: 50 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh *= 60;
  }
  return { h: Math.round(hh), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
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
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function ModernColorPicker({ value, onChange }: Props) {
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [hexInput, setHexInput] = useState(value.toUpperCase());

  // Sync from external value changes
  useEffect(() => {
    setHsl(hexToHsl(value));
    setHexInput(value.toUpperCase());
  }, [value]);

  const update = (next: { h?: number; s?: number; l?: number }) => {
    const merged = { ...hsl, ...next };
    setHsl(merged);
    const hex = hslToHex(merged.h, merged.s, merged.l);
    setHexInput(hex);
    onChange(hex);
  };

  const commitHex = (raw: string) => {
    const v = raw.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
      const normalized = v.startsWith('#') ? v.toUpperCase() : `#${v.toUpperCase()}`;
      setHexInput(normalized);
      setHsl(hexToHsl(normalized));
      onChange(normalized);
    } else {
      setHexInput(raw);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl border-2 border-border shadow-inner"
          style={{ backgroundColor: hexInput }}
        />
        <Input
          value={hexInput}
          onChange={(e) => commitHex(e.target.value)}
          placeholder="#00D4FF"
          className="font-mono uppercase tracking-wider"
          maxLength={7}
        />
      </div>

      <Slider
        label="Teinte"
        value={hsl.h}
        min={0}
        max={360}
        gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))"
        onChange={(v) => update({ h: v })}
      />
      <Slider
        label="Saturation"
        value={hsl.s}
        min={0}
        max={100}
        gradient={`linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))`}
        onChange={(v) => update({ s: v })}
      />
      <Slider
        label="Luminosité"
        value={hsl.l}
        min={0}
        max={100}
        gradient={`linear-gradient(to right, #000, hsl(${hsl.h},${hsl.s}%,50%), #fff)`}
        onChange={(v) => update({ l: v })}
      />
    </div>
  );
}

function Slider({
  label, value, min, max, gradient, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  gradient: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
        <span className="text-[11px] font-mono text-muted-foreground">{value}</span>
      </div>
      <div className="relative h-3 rounded-full" style={{ background: gradient }}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-foreground shadow-md pointer-events-none"
          style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 0.5rem)` }}
        />
      </div>
    </div>
  );
}
