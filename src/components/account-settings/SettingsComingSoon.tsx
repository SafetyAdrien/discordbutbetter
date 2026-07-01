import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComingSoonRow {
  icon?: LucideIcon;
  label: string;
  description?: string;
}

interface SettingsComingSoonProps {
  title: string;
  intro: string;
  rows: ReadonlyArray<ComingSoonRow>;
}

/**
 * Reusable "planned settings" list. Used by categories whose backing
 * behaviour isn't wired yet — we show what's coming instead of faking
 * controls that don't do anything (see AppearanceSettings.tsx "Clair"
 * for the same pattern).
 */
export function SettingsComingSoon({ title, intro, rows }: SettingsComingSoonProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">{intro}</p>
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden max-w-md">
          {rows.map((row, i) => {
            const Icon = row.icon ?? Sparkles;
            return (
              <div
                key={row.label}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 opacity-60',
                  i > 0 && 'border-t border-border/40',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{row.label}</div>
                  {row.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>
                  )}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0 mt-1">
                  Bientôt
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
