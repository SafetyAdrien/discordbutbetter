/**
 * ThemeCardEmbed — renders `[[nexuschat-theme:v1:…]]` markers inline in
 * the chat as a colorful card with an "Appliquer" button. One card per
 * unique theme found in the message.
 */
import { useMemo } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractThemesFromContent, type SharedCustomTheme } from '@/lib/customTheme/encode';
import { applySharedTheme, useCustomTheme } from '@/hooks/useCustomTheme';

function ThemeCard({ theme }: { theme: SharedCustomTheme }) {
  const current = useCustomTheme();
  const isApplied =
    current.enabled &&
    current.angle === theme.angle &&
    current.intensity === theme.intensity &&
    current.chips.length === theme.chips.length &&
    current.chips.every((c, i) => c.toLowerCase() === theme.chips[i].toLowerCase());

  const gradient = useMemo(() => {
    const stops = theme.chips.length === 1
      ? `${theme.chips[0]}, ${theme.chips[0]}`
      : theme.chips.join(', ');
    return `linear-gradient(${theme.angle}deg, ${stops})`;
  }, [theme]);

  const onApply = () => {
    applySharedTheme(theme);
  };

  return (
    <div className="max-w-[420px] rounded-xl overflow-hidden border border-border/60 bg-card mt-1">
      <div className="h-20 relative" style={{ background: gradient }}>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-white text-[10px] font-semibold">
          <Sparkles className="w-3 h-3" /> Thème personnalisé
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">
            {theme.name || 'Thème partagé'}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {theme.chips.map((c, i) => (
              <span key={i} className="w-3.5 h-3.5 rounded-full border border-border/60" style={{ background: c }} />
            ))}
            <span className="text-[11px] text-muted-foreground ml-1">
              {theme.intensity}% · {theme.angle}°
            </span>
          </div>
        </div>
        <Button size="sm" onClick={onApply} disabled={isApplied} className="shrink-0">
          {isApplied ? (
            <><Check className="w-3.5 h-3.5 mr-1" /> Appliqué</>
          ) : 'Appliquer'}
        </Button>
      </div>
    </div>
  );
}

export function ThemeCardEmbeds({ content }: { content: string }) {
  const themes = useMemo(() => extractThemesFromContent(content), [content]);
  if (themes.length === 0) return null;
  // Dedupe by encoded key
  const seen = new Set<string>();
  const unique: SharedCustomTheme[] = [];
  for (const t of themes) {
    const key = `${t.angle}|${t.intensity}|${t.chips.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }
  return (
    <div className="space-y-1">
      {unique.map((t, i) => <ThemeCard key={i} theme={t} />)}
    </div>
  );
}
