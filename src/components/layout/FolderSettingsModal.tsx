import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, Pencil, X } from '@/components/icons/discord/lucide';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '@/lib/colorMath';
import { DEFAULT_FOLDER_COLOR, type ServerFolder } from '@/hooks/useServerFolders';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/*
 * "Parametres du dossier" (video de reference) : nom, couleur parmi le bleu
 * par defaut, une couleur libre (selecteur + hexa) et deux rangees de 10
 * pastilles. Les changements ne sont appliques qu'avec "Terminé".
 */

const PRESETS = [
  ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#607d8b'],
  ['#11806a', '#1f8b4c', '#206694', '#71368a', '#ad1457', '#c27c0e', '#a84300', '#992d22', '#979c9f', '#546e7a'],
];
const PRESET_SET = new Set(PRESETS.flat());

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const HEX = /^#?([0-9a-f]{6})$/i;

function HexPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(value);
    return rgbToHsv(r, g, b);
  });
  const [draft, setDraft] = useState<string | null>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const emit = (n: { h: number; s: number; v: number }) => {
    setHsv(n);
    setDraft(null);
    const { r, g, b } = hsvToRgb(n.h, n.s, n.v);
    onChange(rgbToHex(Math.round(r), Math.round(g), Math.round(b)));
  };

  const drag = (el: HTMLDivElement | null, move: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    if (!el) return;
    e.preventDefault();
    const run = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      move(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
    };
    run(e);
    const up = () => {
      window.removeEventListener('pointermove', run);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', run);
    window.addEventListener('pointerup', up);
  };

  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(Math.round(r), Math.round(g), Math.round(b)).toLowerCase();
  const hueColor = rgbToHex(...(Object.values(hsvToRgb(hsv.h, 1, 1)).map(Math.round) as [number, number, number]));

  return (
    <div className="w-[236px] space-y-3">
      <div
        ref={svRef}
        onPointerDown={drag(svRef.current, (x, y) => emit({ h: hsv.h, s: x, v: 1 - y }))}
        className="relative h-[116px] rounded-[4px] cursor-crosshair touch-none"
        style={{ backgroundColor: hueColor, backgroundImage: 'linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent)' }}
      >
        <span
          className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.6)] pointer-events-none"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>
      <div
        ref={hueRef}
        onPointerDown={drag(hueRef.current, (x) => emit({ ...hsv, h: x * 360 }))}
        className="relative h-[10px] rounded-full cursor-pointer touch-none"
        style={{ background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
      >
        <span
          className="absolute top-1/2 w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white bg-white/10 shadow-[0_0_2px_rgba(0,0,0,0.6)] pointer-events-none"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>
      <label className="flex items-center h-8 px-2.5 rounded-[4px] bg-[hsl(var(--input))] text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-primary">
        #
        <input
          value={draft ?? hex.slice(1)}
          maxLength={7}
          spellCheck={false}
          aria-label="Valeur hexadécimale"
          onChange={(e) => {
            const v = e.target.value.replace(/^#/, '');
            setDraft(v);
            const m = HEX.exec(v);
            if (m) {
              const c = hexToRgb(`#${m[1]}`);
              setHsv(rgbToHsv(c.r, c.g, c.b));
              onChange(`#${m[1].toLowerCase()}`);
            }
          }}
          onBlur={() => setDraft(null)}
          className="flex-1 min-w-0 ml-1 bg-transparent outline-none text-foreground"
        />
      </label>
    </div>
  );
}

interface Props {
  folder: ServerFolder;
  open?: boolean;
  onClose: () => void;
  onSave: (patch: { name: string | null; color: string | null }) => void;
}

export function FolderSettingsModal({ folder, open = true, onClose, onSave }: Props) {
  const [name, setName] = useState(folder.name ?? '');
  const [color, setColor] = useState<string | null>(folder.color);
  const [pickerOpen, setPickerOpen] = useState(false);
  // La pastille "personnalisee" garde la derniere couleur hors defaut, meme si
  // l'utilisateur revient ensuite sur le bleu.
  const [custom, setCustom] = useState<string | null>(folder.color && !PRESET_SET.has(folder.color.toLowerCase()) ? folder.color : null);

  useEffect(() => {
    if (color && !same(color, DEFAULT_FOLDER_COLOR)) setCustom((c) => (PRESET_SET.has(color.toLowerCase()) ? color : c ?? color));
  }, [color]);

  const isDefault = !color || same(color, DEFAULT_FOLDER_COLOR);
  const isCustomColor = !isDefault && !PRESET_SET.has(color!.toLowerCase());
  const done = () => {
    onSave({ name: name.trim() || null, color: isDefault ? null : color });
    onClose();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[100] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[hsl(var(--input))] border border-white/[0.08] p-6 shadow-[0_8px_16px_rgba(0,0,0,0.24)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.92] data-[state=closed]:duration-150 outline-none"
        >
          <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white pt-1">Paramètres du dossier</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className="absolute top-5 right-5 w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </DialogPrimitive.Close>

          <label htmlFor="folder-name" className="block mt-6 mb-2 text-sm font-semibold text-white">Nom du dossier</label>
          <input
            id="folder-name"
            value={name}
            maxLength={32}
            placeholder="Nom du dossier"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && done()}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))]/60 border border-black/10 text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none focus:border-primary"
          />

          <p className="mt-6 mb-2 text-sm font-semibold text-white">Couleur du dossier</p>
          <div className="flex gap-2.5">
            <button
              type="button"
              aria-label="Couleur par défaut"
              aria-pressed={isDefault}
              onClick={() => setColor(null)}
              className="relative w-[70px] h-[50px] rounded-lg flex items-center justify-center transition-transform active:scale-95"
              style={{ background: DEFAULT_FOLDER_COLOR }}
            >
              {isDefault && <Check className="w-6 h-6 text-white" />}
            </button>

            <PopoverPrimitive.Root open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverPrimitive.Anchor asChild>
                <span className="inline-flex">
                <Tooltip>
                <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Couleur personnalisée"
                  aria-pressed={isCustomColor}
                  onClick={() => {
                    if (isDefault && custom) setColor(custom);
                    setPickerOpen((o) => !o);
                  }}
                  className="relative w-[70px] h-[50px] rounded-lg flex items-center justify-center transition-transform active:scale-95"
                  style={{ background: !isDefault ? color! : 'hsl(var(--background) / 0.6)' }}
                >
                  {isCustomColor && <Check className="w-6 h-6 text-white" />}
                  <Pencil className="absolute top-1.5 right-1.5 w-3 h-3 text-white" />
                </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[200]">Couleurs personnalisées</TooltipContent>
                </Tooltip>
                </span>
              </PopoverPrimitive.Anchor>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="z-[110] rounded-lg bg-popover p-3 shadow-[0_8px_16px_rgba(0,0,0,0.24)] border border-white/[0.06] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
                >
                  <HexPicker
                    value={color ?? DEFAULT_FOLDER_COLOR}
                    onChange={(hex) => {
                      setColor(hex);
                      setCustom(hex);
                    }}
                  />
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {PRESETS.map((row, i) => (
              <div key={i} className="flex gap-2.5">
                {row.map((c) => {
                  const sel = !isDefault && same(c, color!);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      aria-pressed={sel}
                      onClick={() => setColor(c)}
                      className="w-5 h-5 rounded-[5px] flex items-center justify-center transition-transform hover:scale-110"
                      style={{ background: c }}
                    >
                      {sel && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={done}
            className={cn('mt-6 w-full h-[38px] rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 text-sm font-medium text-white transition-colors')}
          >
            Terminé
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
