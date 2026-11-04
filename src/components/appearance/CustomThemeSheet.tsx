/**
 * CustomThemeSheet — Discord-like side sheet shown after clicking the
 * personalization card. It is intentionally non-modal: the app stays visible
 * behind it and receives the live theme preview.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dice5, Moon, RotateCcw, Sun } from 'lucide-react';
import { Pipette, Plus, Share2, X } from '@/components/icons/discord/lucide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
  addChip,
  applyDraft,
  discardDraft,
  randomizeDraft,
  removeChip,
  resetCustomTheme,
  setChip,
  setDraft,
  useCustomThemeSnapshot,
} from '@/hooks/useCustomTheme';
import { HsvColorPicker } from './HsvColorPicker';
import { ShareCustomThemeDialog } from './ShareCustomThemeDialog';

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
  <div className="discord-theme-section-label">{children}</div>
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
      // Ensure live preview kicks in even if the committed theme is disabled.
      if (!snap.draft.enabled) setDraft({ enabled: true });
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, snap.isDirty]);

  const handleApply = () => {
    if (draft.chips.length > 0 && !draft.enabled) setDraft({ enabled: true });
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
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
  ];

  const panel = (
    <div
      role="dialog"
      aria-label="Personnalisez votre thème"
      data-ct-lift="true"
      className={cn(
        'discord-theme-sheet fixed inset-y-0 right-0 z-[80] w-full sm:w-[290px] flex flex-col',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        entered ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="discord-theme-header">
        <h2 className="discord-theme-title">
          Customize your theme
          <RotateCcw className="discord-theme-title-icon" aria-hidden />
        </h2>
        <button type="button" onClick={() => close(false)} aria-label="Fermer" className="discord-theme-close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="discord-theme-body flex-1 overflow-y-auto min-h-0">
        <section className="discord-theme-section">
          <SectionLabel>Appearance</SectionLabel>
          <div className="discord-theme-segmented" role="radiogroup" aria-label="Apparence">
            {themeCards.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  className={cn('discord-theme-mode-button', active && 'discord-theme-mode-button-active')}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="discord-theme-section">
          <SectionLabel>Colors</SectionLabel>
          <div className="discord-theme-color-stack">
            <HsvColorPicker hex={draft.chips[selectedChip] ?? '#000000'} onChange={(h) => setChip(selectedChip, h)} />

            <div className="discord-theme-hex-row">
              <div className="discord-theme-swatch" style={{ background: draft.chips[selectedChip] ?? '#000000' }} />
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
                className="discord-theme-hex-input"
              />
              <button
                type="button"
                onClick={handleEyedropper}
                disabled={!eyedropperSupported}
                aria-label="Prélever une couleur à l'écran"
                title={eyedropperSupported ? 'Prélever une couleur' : 'Non supporté par ce navigateur'}
                className="discord-theme-eyedropper"
              >
                <Pipette className="w-4 h-4" />
              </button>
            </div>

            {draft.chips.length > 1 && (
              <div className="discord-theme-chips-row">
                {draft.chips.map((hex, i) => (
                  <div key={`${hex}-${i}`} className="discord-theme-chip-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedChip(i)}
                      aria-label={`Couleur ${i + 1}`}
                      aria-pressed={selectedChip === i}
                      className={cn('discord-theme-chip', selectedChip === i && 'discord-theme-chip-active')}
                      style={{ background: hex }}
                    />
                    <button
                      type="button"
                      onClick={() => removeChip(i)}
                      aria-label={`Supprimer la couleur ${i + 1}`}
                      className="discord-theme-chip-remove"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={draft.chips.length >= 3}
              onClick={() => {
                addChip();
                setSelectedChip(Math.min(2, draft.chips.length));
              }}
              className="discord-theme-wide-button"
            >
              <Plus className="w-5 h-5" />
              Add Color
            </button>
          </div>
        </section>

        <section className="discord-theme-section discord-theme-controls">
          <SectionLabel>Controls</SectionLabel>
          {draft.chips.length >= 2 && (
            <div className="discord-theme-control-block">
              <div className="discord-theme-control-row">
                <span>Gradient Direction</span>
                <span className="discord-theme-control-value">{draft.angle}°</span>
              </div>
              <Slider
                value={[draft.angle]}
                min={0}
                max={360}
                step={1}
                onValueChange={([v]) => setDraft({ angle: v })}
                className="discord-theme-slider"
              />
            </div>
          )}
          <div className="discord-theme-control-block">
            <div className="discord-theme-control-row">
              <span>Color Intensity</span>
              <span className="discord-theme-control-value">{draft.intensity}%</span>
            </div>
            <Slider
              value={[draft.intensity]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => setDraft({ intensity: v })}
              className="discord-theme-slider"
            />
          </div>
        </section>

        <div className="discord-theme-action-stack">
          <button type="button" onClick={randomizeDraft} className="discord-theme-wide-button discord-theme-surprise">
            <Dice5 className="w-5 h-5" /> Surprise Me!
          </button>
          <button type="button" onClick={resetCustomTheme} className="discord-theme-wide-button discord-theme-reset">
            Reset
          </button>
        </div>
      </div>

      <div className="discord-theme-footer">
        <button type="button" onClick={() => setShareOpen(true)} aria-label="Partager le thème" className="discord-theme-footer-icon">
          <Share2 className="w-4 h-4" />
        </button>
        <Button variant="ghost" size="sm" onClick={() => close(false)} className="discord-theme-footer-secondary">
          Back
        </Button>
        <Button size="sm" onClick={handleApply} disabled={!snap.isDirty} className="discord-theme-apply">
          Apply
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
