import { Palette, Plus, X, Shuffle, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  useCustomTheme,
  setCustomTheme,
  setChip,
  addChip,
  removeChip,
  randomizeCustomTheme,
  resetCustomTheme,
} from '@/hooks/useCustomTheme';

/**
 * A dedicated inline editor rendered inside the Appearance settings.
 * All mutations flow through the module-level cache in `useCustomTheme`
 * which is rAF-throttled, so dragging a color/slider doesn't re-render
 * the surrounding modal.
 */
export function CustomThemeEditor({ onClose }: { onClose: () => void }) {
  const state = useCustomTheme();

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-primary to-secondary grid place-items-center">
          <Palette className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Éditeur de thème personnalisé</div>
          <div className="text-xs text-muted-foreground">
            Choisissez jusqu'à 3 couleurs — l'aperçu est immédiat.
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Check className="w-4 h-4 mr-1" /> Terminé
        </Button>
      </div>

      {/* Chip pickers */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Couleurs
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state.chips.map((hex, i) => (
            <div key={i} className="relative group">
              <label
                className="block w-12 h-12 rounded-[14px] border border-border/60 cursor-pointer shadow-sm"
                style={{ background: hex }}
              >
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setChip(i, e.target.value)}
                  className="opacity-0 w-full h-full cursor-pointer"
                  aria-label={`Couleur ${i + 1}`}
                />
              </label>
              {state.chips.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChip(i)}
                  aria-label="Supprimer la couleur"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border border-border grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          {state.chips.length < 3 && (
            <button
              type="button"
              onClick={addChip}
              aria-label="Ajouter une couleur"
              className="w-12 h-12 rounded-[14px] border border-dashed border-border/80 grid place-items-center text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Intensity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Intensité
          </label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {state.intensity}%
          </span>
        </div>
        <Slider
          value={[state.intensity]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => setCustomTheme({ intensity: v, enabled: true }, { persist: false })}
          onValueCommit={([v]) => setCustomTheme({ intensity: v, enabled: true })}
        />
      </div>

      {/* Angle */}
      {state.chips.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Angle du dégradé
            </label>
            <span className="text-xs tabular-nums text-muted-foreground">{state.angle}°</span>
          </div>
          <Slider
            value={[state.angle]}
            min={0}
            max={360}
            step={1}
            onValueChange={([v]) => setCustomTheme({ angle: v, enabled: true }, { persist: false })}
            onValueCommit={([v]) => setCustomTheme({ angle: v, enabled: true })}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant={state.enabled ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setCustomTheme({ enabled: !state.enabled })}
        >
          {state.enabled ? 'Désactiver' : 'Activer'}
        </Button>
        <Button variant="outline" size="sm" onClick={randomizeCustomTheme}>
          <Shuffle className="w-3.5 h-3.5 mr-1.5" /> Surprends-moi
        </Button>
        <Button variant="ghost" size="sm" onClick={resetCustomTheme}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Réinitialiser
        </Button>
      </div>
    </div>
  );
}
