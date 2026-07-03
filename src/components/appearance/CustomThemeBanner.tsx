import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CustomThemeEditor } from './CustomThemeEditor';
import { useCustomTheme } from '@/hooks/useCustomTheme';

/**
 * Entry-point banner shown under the Dark/Light theme cards. Collapses to
 * a marketing-style stripe when closed and expands to reveal the full
 * editor when clicked. Kept purely presentational; heavy state lives in
 * `useCustomTheme`.
 */
export function CustomThemeBanner() {
  const [open, setOpen] = useState(false);
  const state = useCustomTheme();

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group relative w-full overflow-hidden rounded-2xl border border-border/60 text-left"
        style={{
          background:
            'linear-gradient(120deg, hsl(var(--primary) / 0.85), hsl(280 70% 55% / 0.85), hsl(24 95% 60% / 0.85))',
        }}
      >
        {/* subtle animated highlight */}
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
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {state.enabled && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/25">Actif</span>
            )}
            <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-white text-black">
              {open ? 'Fermer' : 'Essayer'}
            </span>
          </div>
        </div>
      </button>

      {open && <CustomThemeEditor onClose={() => setOpen(false)} />}
    </div>
  );
}
