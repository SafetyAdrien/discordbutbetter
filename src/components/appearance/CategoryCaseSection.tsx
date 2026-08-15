import { useEffect, useMemo, useRef, useState, useId } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCategoryCasePreferences } from '@/hooks/useCategoryCasePreferences';
import {
  CASE_OPTIONS,
  CategoryCaseZone,
  DEFAULT_CATEGORY_CASE_PREFS,
  ZONE_LABELS,
} from '@/lib/ui/categoryCase';
import { CategoryCaseLivePreview } from './CategoryCaseLivePreview';

const ZONE_ORDER: CategoryCaseZone[] = [
  'channelCategories',
  'userSettings',
  'serverSettings',
  'categoryModal',
  'profileEdit',
];

const CASE_ANNOUNCEMENT: Record<string, string> = {
  upper: 'majuscules',
  lower: 'minuscules',
  title: 'capitalisé',
  none: 'original',
};

export function CategoryCaseSection() {
  const { prefs, setZone, resetAll } = useCategoryCasePreferences();
  const liveRegionId = useId();
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef<number | null>(null);

  const isDefault = useMemo(
    () =>
      ZONE_ORDER.every(
        (z) =>
          prefs[z].enabled === DEFAULT_CATEGORY_CASE_PREFS[z].enabled &&
          prefs[z].case === DEFAULT_CATEGORY_CASE_PREFS[z].case,
      ),
    [prefs],
  );

  // Debounced ARIA live announcement on any prefs change
  useEffect(() => {
    if (announceTimer.current) window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => {
      const parts = ZONE_ORDER.map((z) => {
        const p = prefs[z];
        return `${ZONE_LABELS[z]} : ${p.enabled ? CASE_ANNOUNCEMENT[p.case] : 'désactivé'}`;
      });
      setAnnouncement(`Aperçu mis à jour. ${parts.join('. ')}.`);
    }, 150);
    return () => {
      if (announceTimer.current) window.clearTimeout(announceTimer.current);
    };
  }, [prefs]);

  return (
    <section data-settings-section-id="category-typography" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold mb-1">Typographie des catégories</h2>
          <p className="text-sm text-muted-foreground">
            Ce réglage est purement visuel de ton côté et te suit sur tous tes appareils.
            Il ne change pas les noms réels et n'est pas visible par les autres utilisateurs.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDefault}
              className="shrink-0 rounded-[10px] focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Réinitialiser
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Réinitialiser la typographie ?</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes les zones reviendront à l'apparence par défaut. Ce changement ne concerne
                que ton compte et se synchronisera sur tes appareils.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => void resetAll()}>Réinitialiser</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ARIA live region for screen readers */}
      <div id={liveRegionId} aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-2 min-w-0">
          {ZONE_ORDER.map((zone) => {
            const p = prefs[zone];
            return (
              <div
                key={zone}
                className="rounded-[10px] border border-border/50 bg-card/40 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium truncate">{ZONE_LABELS[zone]}</div>
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(v) => setZone(zone, { enabled: v })}
                    aria-label={`Activer la casse personnalisée pour ${ZONE_LABELS[zone]}`}
                  />
                </div>

                <div className="flex items-center gap-1.5" role="radiogroup" aria-label={`Casse — ${ZONE_LABELS[zone]}`}>
                  {CASE_OPTIONS.map((opt) => {
                    const active = p.enabled && p.case === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={!p.enabled}
                        onClick={() => setZone(zone, { case: opt.value })}
                        title={opt.hint}
                        aria-label={`${ZONE_LABELS[zone]} — ${opt.hint}`}
                        className={cn(
                          'h-8 min-w-[40px] px-2 rounded-[10px] text-sm font-medium transition-colors duration-150 border',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                          active
                            ? 'bg-primary/12 text-primary border-primary/40'
                            : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground',
                          !p.enabled && 'opacity-40 cursor-not-allowed',
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <CategoryCaseLivePreview />
        </div>
      </div>
    </section>
  );
}
