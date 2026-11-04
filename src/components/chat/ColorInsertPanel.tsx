import { useMemo, useState } from 'react';
import { ChevronLeft, Pipette, Search } from '@/components/icons/discord/lucide';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { NAMED_COLORS, nearestColorName, normalizeHex } from '@/lib/colorNames';
import { cn } from '@/lib/utils';
import { userKey } from '@/lib/userScope';

/*
 * Sous-menu "Couleur" du "+" de la zone de saisie : palette Discord,
 * couleurs recentes, recherche par nom / hex, pipette (si le navigateur
 * la propose) et selecteur libre. Un clic sur une pastille insere
 * directement la couleur ; le selecteur libre passe par "Inserer".
 */

const RECENT_KEY = 'composer:recent-colors';
const MAX_RECENT = 8;

const PALETTE = [
  '#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#FFFFFF',
  '#1ABC9C', '#2ECC71', '#3498DB', '#9B59B6', '#E91E63', '#F1C40F',
  '#E67E22', '#E74C3C', '#95A5A6', '#607D8B', '#11806A', '#1F8B4C',
  '#206694', '#71368A', '#AD1457', '#C27C0E', '#A84300', '#992D22',
];

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(userKey(RECENT_KEY)) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(hex: string) {
  try {
    const next = [hex, ...readRecent().filter((h) => h.toLowerCase() !== hex.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(userKey(RECENT_KEY), JSON.stringify(next));
  } catch {
    /* stockage indisponible */
  }
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

interface Props {
  onBack: () => void;
  onPick: (hex: string) => void;
}

export function ColorInsertPanel({ onBack, onPick }: Props) {
  const [recent] = useState(readRecent);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('#5865F2');
  const [showCustom, setShowCustom] = useState(false);
  const EyeDropper = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;

  const pick = (raw: string) => {
    const hex = normalizeHex(raw);
    if (!hex) return;
    pushRecent(hex);
    onPick(hex);
  };

  const q = query.trim().toLowerCase();
  const typedHex = normalizeHex(q.startsWith('#') ? q : `#${q}`);
  const matches = useMemo(() => {
    if (!q) return [];
    const seen = new Set<string>();
    return NAMED_COLORS.filter((c) => {
      const key = c.name.toLowerCase();
      if (seen.has(key) || !key.includes(q.replace(/\s+/g, ''))) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [q]);

  const swatch = (hex: string, i: number) => (
    <button
      key={`${hex}-${i}`}
      type="button"
      title={`${nearestColorName(hex)} · ${hex.toUpperCase()}`}
      aria-label={`${nearestColorName(hex)} ${hex}`}
      onClick={() => pick(hex)}
      className="w-6 h-6 rounded-md ring-1 ring-inset ring-white/10 hover:scale-110 hover:ring-white/60 transition-transform"
      style={{ background: hex }}
    />
  );

  return (
    <div className="w-[264px]">
      <div className="flex items-center gap-1 px-1 pb-1.5 mb-1.5 border-b border-white/[0.06]">
        <button type="button" aria-label="Retour" onClick={onBack} className="p-1 rounded text-[hsl(var(--icon-default))] hover:text-white hover:bg-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="flex-1 text-sm font-semibold text-white">Insérer une couleur</span>
        {EyeDropper && (
          <button
            type="button"
            title="Pipette"
            aria-label="Pipette"
            onClick={async () => {
              try {
                const { sRGBHex } = await new EyeDropper().open();
                pick(sRGBHex);
              } catch {
                /* annule */
              }
            }}
            className="p-1 rounded text-[hsl(var(--icon-default))] hover:text-white hover:bg-muted"
          >
            <Pipette className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-1.5 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (typedHex) pick(typedHex);
              else if (matches[0]) pick(matches[0].hex);
            }}
            placeholder="Nom ou #hex"
            aria-label="Rechercher une couleur"
            className="w-full h-8 pl-7 pr-2 rounded-md bg-[hsl(var(--search-background))] border border-white/[0.08] focus:border-primary outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {q ? (
          <div className="space-y-0.5">
            {typedHex && (
              <button type="button" onClick={() => pick(typedHex)} className="w-full flex items-center gap-2 px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors text-left">
                <span className="w-4 h-4 rounded ring-1 ring-inset ring-white/10" style={{ background: typedHex }} />
                <span className="flex-1 text-white">{nearestColorName(typedHex)}</span>
                <span className="font-mono text-xs text-muted-foreground">{typedHex.toUpperCase()}</span>
              </button>
            )}
            {matches.map((c) => (
              <button key={c.name} type="button" onClick={() => pick(c.hex)} className="w-full flex items-center gap-2 px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors text-left">
                <span className="w-4 h-4 rounded ring-1 ring-inset ring-white/10" style={{ background: c.hex }} />
                <span translate="no" className="flex-1 text-white">{c.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.hex.toUpperCase()}</span>
              </button>
            ))}
            {!typedHex && !matches.length && <p className="px-2 py-2 text-xs text-muted-foreground">Aucune couleur trouvée.</p>}
          </div>
        ) : (
          <>
            {recent.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Récentes</p>
                <div className="flex flex-wrap gap-1.5">{recent.map(swatch)}</div>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Palette</p>
              <div className="grid grid-cols-6 gap-1.5 justify-items-start">{PALETTE.map(swatch)}</div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowCustom((v) => !v)}
                className={cn('w-full flex items-center gap-2 px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground text-left hover:bg-[hsl(var(--surface-hover))] transition-colors', showCustom && 'bg-[hsl(var(--surface-hover))]')}
              >
                <span className="w-4 h-4 rounded-full" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} />
                <span className="flex-1 text-white">Couleur personnalisée</span>
              </button>
              {showCustom && (
                <div className="pt-2 space-y-2">
                  <ModernColorPicker value={custom} onChange={setCustom} />
                  <button
                    type="button"
                    onClick={() => pick(custom)}
                    className="w-full h-8 rounded-md bg-primary hover:bg-primary/90 text-white text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <span className="w-3 h-3 rounded-sm ring-1 ring-white/40" style={{ background: custom }} />
                    Insérer {nearestColorName(custom)}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
