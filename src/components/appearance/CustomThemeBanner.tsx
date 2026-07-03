import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CustomThemeSheet } from './CustomThemeSheet';
import { useCustomTheme, setCommittedEnabled } from '@/hooks/useCustomTheme';

/**
 * Entry-point banner under the Dark/Light theme cards. Opens the full
 * `CustomThemeSheet` and exposes a quick on/off toggle right on the banner.
 */
export function CustomThemeBanner() {
  const [open, setOpen] = useState(false);
  const state = useCustomTheme();

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Ouvrir l'éditeur de thème personnalisé"
        className="group relative w-full overflow-hidden rounded-2xl border border-border/60 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{
          background:
            'linear-gradient(120deg, hsl(var(--primary) / 0.85), hsl(280 70% 55% / 0.85), hsl(24 95% 60% / 0.85))',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity"
          style={{
            background:
              'radial-gradient(600px circle at 20% 30%, rgba(255,255,255,0.35), transparent 40%)',
          }}
        />
        <div className="relative flex items-center gap-4 p-4 md:p-5 text-white">
          <div className="w-11 h-11 rounded-[14px] bg-white/20 backdrop-blur grid place-items-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-base md:text-lg leading-tight">
              Rendez NexusChat <em className="italic">paarfait</em>
            </div>
            <div className="text-sm text-white/85">
              Composez votre propre palette et donnez à l'interface votre signature.
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            {state.enabled && (
              <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-white/25">Actif</span>
            )}
            <Switch
              checked={state.enabled}
              onCheckedChange={setCommittedEnabled}
              aria-label="Activer/désactiver le thème personnalisé"
            />
            <span className="hidden md:inline text-sm font-semibold px-3 py-1.5 rounded-full bg-white text-black">
              Personnaliser
            </span>
          </div>
        </div>
      </div>

      <CustomThemeSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
