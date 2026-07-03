/**
 * CustomThemeSheet — reproduction fidèle du side sheet "Customize your theme"
 * de la référence (voir vidéo). Non-modal, glisse depuis la droite, laisse
 * toute l'interface visible et interactive derrière.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Plus, X, Share2, Pipette, Moon, Sun, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { HsvColorPicker } from './HsvColorPicker';
import { ShareCustomThemeDialog } from './ShareCustomThemeDialog';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
    {children}
  </div>
);

export function CustomThemeSheet({ open, onOpenChange }: CustomThemeSheetProps) {
  const snap = useCustomThemeSnapshot();
  const draft = snap.draft;
  const { theme, setTheme } = useTheme();

  const [selectedChip, setSelectedChip] = useState(0);
  const [hexInput, setHexInput] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (selectedChip >= draft.chips.length) setSelectedChip(Math.max(0, draft.chips.length - 1));
  }, [draft.chips.length, selectedChip]);

  useEffect(() => {
    setHexInput(draft.chips[selectedChip] ?? '#000000');
  }, [selectedChip, draft.chips]);

  const close = (nextOpen: boolean) => {
    if (!nextOpen && snap.isDirty) discardDraft();
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, snap.isDirty]);

  const handleApply = () => {
    if (draft.chips.length > 0 && !draft.enabled) setDraft({ enabled: true });
    // Apply on next tick so the enabled flag is picked up.
    requestAnimationFrame(() => applyDraft());
  };

  const handleEyedropper = async () => {
    // @ts-expect-error EyeDropper API is experimental
    if (typeof window.EyeDropper !== 'function') return;
    try {
      // @ts-expect-error EyeDropper API is experimental
      const ed = new window.EyeDropper();
      const res = await ed.open();
      const hex = normalizeHex(res?.sRGBHex);
      if (hex) setChip(selectedChip, hex);
    } catch {
      // user cancelled
    }
  };

  const eyedropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

  if (!mounted) return null;

  const themeCards: Array<{ value: ThemePreference; label: string; icon: typeof Moon }> = [
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'light', label: 'Clair', icon: Sun },
  ];

  const panel = (
    <div
      role="dialog"
      aria-label="Personnalisez votre thème"
      data-ct-lift="true"
      className={cn(
        'fixed inset-y-0 right-0 z-[80] w-full sm:w-[380px]',
        'bg-background border-l border-border/60',
        'shadow-[-12px_0_40px_-12px_rgba(0,0,0,0.35)]',
        'flex flex-col',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        entered ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-border/40">
        <h2 className="text-[15px] font-semibold leading-tight">Personnalisez votre thème</h2>
        <button
          type="button"
          onClick={() => close(false)}
          aria-label="Fermer"
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="w-7 h-7 rounded-full border border-border/70 grid place-items-center">
            <X className="w-3.5 h-3.5" />
          </span>
          <span className="text-[10px] font-semibold tracking-wider">ESC</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
        {/* Appearance */}
        <section>
          <SectionLabel>Apparence</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            {themeCards.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    'relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 bg-card hover:border-primary/40',
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {active && (
                      <span className="w-4 h-4 rounded-full bg-primary grid place-items-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Colors */}
        <section>
          <SectionLabel>Couleurs</SectionLabel>
          <div className="space-y-3">
            <HsvColorPicker
              hex={draft.chips[selectedChip] ?? '#000000'}
              onChange={(h) => setChip(selectedChip, h)}
            />

            {/* Hex row */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg border border-border/60 shrink-0"
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
                className="font-mono text-sm h-9"
              />
              <button
                type="button"
                onClick={handleEyedropper}
                disabled={!eyedropperSupported}
                aria-label="Prélever une couleur à l'écran"
                title={eyedropperSupported ? 'Prélever une couleur' : 'Non supporté par ce navigateur'}
                className="w-9 h-9 shrink-0 rounded-lg border border-border/60 grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Pipette className="w-4 h-4" />
              </button>
            </div>

            {/* Chips row (when more than one) */}
            {draft.chips.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {draft.chips.map((hex, i) => (
                  <div key={i} className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectedChip(i)}
                      aria-label={`Couleur ${i + 1}`}
                      aria-pressed={selectedChip === i}
                      className={cn(
                        'w-9 h-9 rounded-lg border-2 transition-all',
                        selectedChip === i
                          ? 'border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.3)]'
                          : 'border-border/60 hover:border-border',
                      )}
                      style={{ background: hex }}
                    />
                    <button
                      type="button"
                      onClick={() => removeChip(i)}
                      aria-label={`Supprimer la couleur ${i + 1}`}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-background border border-border grid place-items-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add color */}
            <button
              type="button"
              disabled={draft.chips.length >= 3}
              onClick={() => {
                addChip();
                setSelectedChip(Math.min(2, draft.chips.length));
              }}
              className={cn(
                'w-full h-10 rounded-full border-2 border-dashed border-border/70',
                'flex items-center justify-center gap-1.5 text-sm font-medium',
                'text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5',
                'disabled:opacity-40 disabled:cursor-not-allowed transition-all',
              )}
            >
              <Plus className="w-4 h-4" />
              Ajouter une couleur
            </button>
          </div>
        </section>

        {/* Controls */}
        <section>
          <SectionLabel>Réglages</SectionLabel>
          {draft.chips.length >= 2 && (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm">Direction du dégradé</span>
                <span className="text-xs tabular-nums text-muted-foreground">{draft.angle}°</span>
              </div>
              <Slider
                value={[draft.angle]}
                min={0}
                max={360}
                step={1}
                onValueChange={([v]) => setDraft({ angle: v })}
                className="mb-4"
              />
            </>
          )}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm">Intensité</span>
            <span className="text-xs tabular-nums text-muted-foreground">{draft.intensity}%</span>
          </div>
          <Slider
            value={[draft.intensity]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => setDraft({ intensity: v })}
          />
        </section>


        {/* Actions centrées */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={randomizeDraft}
            className="rounded-full px-5"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Surprends-moi
          </Button>
          <button
            type="button"
            onClick={resetCustomTheme}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 bg-background/95 backdrop-blur px-3 py-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Partager le thème"
          className="w-9 h-9 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => close(false)}>
          {snap.isDirty ? 'Retour' : 'Fermer'}
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!snap.isDirty}
          className="min-w-[92px]"
        >
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
