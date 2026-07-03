/**
 * CustomThemeSheet — full-featured editor matching the reference flow.
 *
 * Behavior:
 *  - Slides in from the right (420px on desktop, full width on mobile).
 *  - NON-MODAL: no backdrop, no body-scroll lock, no focus trap. The app
 *    behind (channel list, chat, settings modal) stays fully visible and
 *    interactive so the live preview tints everything in real time,
 *    exactly like the reference video.
 *  - Escape or the footer buttons close it.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Shuffle, RotateCcw, Plus, X, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { HsvColorPicker } from './HsvColorPicker';
import { ShareCustomThemeDialog } from './ShareCustomThemeDialog';
import {
  useCustomThemeSnapshot,
  setDraft,
  setChip,
  addChip,
  removeChip,
  randomizeDraft,
  discardDraft,
  applyDraft,
  resetCustomTheme,
} from '@/hooks/useCustomTheme';

interface CustomThemeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HEX_RE = /^#?[0-9a-f]{6}$/i;

function normalizeHex(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (HEX_RE.test(v)) return v.startsWith('#') ? v.toLowerCase() : `#${v.toLowerCase()}`;
  return null;
}

export function CustomThemeSheet({ open, onOpenChange }: CustomThemeSheetProps) {
  const snap = useCustomThemeSnapshot();
  const draft = snap.draft;

  const [selectedChip, setSelectedChip] = useState(0);
  const [hexInput, setHexInput] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  // Mount/unmount with slide transition
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next frame: trigger the slide-in
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(t);
  }, [open]);

  // Keep chip index in range.
  useEffect(() => {
    if (selectedChip >= draft.chips.length) setSelectedChip(Math.max(0, draft.chips.length - 1));
  }, [draft.chips.length, selectedChip]);

  // Sync hex input to selected chip.
  useEffect(() => {
    setHexInput(draft.chips[selectedChip] ?? '#000000');
  }, [selectedChip, draft.chips]);

  // Escape key closes (only when open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, snap.isDirty]);

  const close = (nextOpen: boolean) => {
    if (!nextOpen && snap.isDirty) {
      discardDraft();
    }
    onOpenChange(nextOpen);
  };

  const gradient = useMemo(() => {
    const stops = draft.chips.length === 1
      ? `${draft.chips[0]}, ${draft.chips[0]}`
      : draft.chips.join(', ');
    return `linear-gradient(${draft.angle}deg, ${stops})`;
  }, [draft.chips, draft.angle]);

  if (!mounted) return null;

  const panel = (
    <div
      role="dialog"
      aria-label="Éditeur de thème personnalisé"
      className={[
        'fixed inset-y-0 right-0 z-[80]',
        'w-full sm:w-[420px]',
        'bg-background border-l border-border/60',
        'shadow-[-12px_0_40px_-12px_rgba(0,0,0,0.35)]',
        'flex flex-col',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        entered ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">Thème personnalisé</h2>
          <p className="text-sm text-muted-foreground">Composez, prévisualisez, appliquez.</p>
        </div>
        <button
          type="button"
          onClick={() => close(false)}
          aria-label="Fermer"
          className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 space-y-5 min-h-0">
        {/* Live preview */}
        <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm">
          <div
            className="h-32 relative"
            style={{ background: gradient, opacity: Math.max(0.25, draft.intensity / 100) }}
          >
            <div className="absolute inset-0 grid place-items-center">
              <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur text-white text-xs font-semibold">
                Aperçu en direct
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-card">
            <div className="flex items-center gap-2 min-w-0">
              {draft.chips.map((c, i) => (
                <span
                  key={i}
                  className="w-4 h-4 rounded-full border border-border/60"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(draft.intensity)}% · {Math.round(draft.angle)}°</span>
          </div>
        </div>

        {/* HSV picker */}
        <HsvColorPicker
          hex={draft.chips[selectedChip] ?? '#000000'}
          onChange={(h) => setChip(selectedChip, h)}
        />

        {/* Hex input */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Hex
          </label>
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg border border-border/60"
              style={{ background: draft.chips[selectedChip] ?? '#000000' }}
            />
            <Input
              value={hexInput}
              onChange={(e) => {
                const v = e.target.value;
                setHexInput(v);
                const norm = normalizeHex(v);
                if (norm) setChip(selectedChip, norm);
              }}
              placeholder="#5865F2"
              spellCheck={false}
              maxLength={7}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Chips row */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Palette ({draft.chips.length}/3)
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draft.chips.map((hex, i) => (
              <div key={i} className="relative">
                <button
                  type="button"
                  onClick={() => setSelectedChip(i)}
                  aria-label={`Sélectionner la couleur ${i + 1}`}
                  aria-pressed={selectedChip === i}
                  className={`w-11 h-11 rounded-xl border-2 transition-all ${
                    selectedChip === i
                      ? 'border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.3)] scale-105'
                      : 'border-border/60 hover:border-border'
                  }`}
                  style={{ background: hex }}
                />
                {draft.chips.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChip(i)}
                    aria-label={`Supprimer la couleur ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border grid place-items-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {draft.chips.length < 3 && (
              <button
                type="button"
                onClick={() => { addChip(); setSelectedChip(Math.min(2, draft.chips.length)); }}
                aria-label="Ajouter une couleur"
                className="w-11 h-11 rounded-xl border-2 border-dashed border-border/80 grid place-items-center text-muted-foreground hover:bg-muted/50 hover:border-primary/50 hover:text-primary transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Angle */}
        {draft.chips.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Angle
              </label>
              <span className="text-xs tabular-nums text-muted-foreground">{draft.angle}°</span>
            </div>
            <Slider
              value={[draft.angle]}
              min={0}
              max={360}
              step={1}
              onValueChange={([v]) => setDraft({ angle: v })}
            />
          </div>
        )}

        {/* Intensity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Intensité
            </label>
            <span className="text-xs tabular-nums text-muted-foreground">{draft.intensity}%</span>
          </div>
          <Slider
            value={[draft.intensity]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => setDraft({ intensity: v })}
          />
        </div>

        {/* On/off + secondary actions */}
        <div className="rounded-xl border border-border/60 bg-card/50 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Activer le thème personnalisé</div>
              <div className="text-xs text-muted-foreground">Applique la teinte à toute l'interface.</div>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(v) => setDraft({ enabled: v })}
              aria-label="Activer le thème personnalisé"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={randomizeDraft}>
              <Shuffle className="w-3.5 h-3.5 mr-1.5" /> Surprends-moi
            </Button>
            <Button variant="ghost" size="sm" onClick={resetCustomTheme}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 bg-background/95 backdrop-blur p-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="shrink-0"
        >
          <Share2 className="w-4 h-4 mr-1.5" /> Partager
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => close(false)}>
          {snap.isDirty ? 'Annuler' : 'Fermer'}
        </Button>
        <Button
          size="sm"
          onClick={applyDraft}
          disabled={!snap.isDirty}
          className="min-w-[110px]"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Appliquer
        </Button>
      </div>

      <ShareCustomThemeDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        theme={{ chips: draft.chips, angle: draft.angle, intensity: draft.intensity }}
      />
    </div>
  );

  return createPortal(panel, document.body);
}
