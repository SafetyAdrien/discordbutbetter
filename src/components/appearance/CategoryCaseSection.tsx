import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useCategoryCasePreferences } from '@/hooks/useCategoryCasePreferences';
import {
  CASE_OPTIONS,
  CategoryCaseZone,
  ZONE_LABELS,
  caseClass,
} from '@/lib/ui/categoryCase';

const ZONE_ORDER: CategoryCaseZone[] = [
  'channelCategories',
  'userSettings',
  'serverSettings',
  'categoryModal',
];

const ZONE_PREVIEW: Record<CategoryCaseZone, string> = {
  channelCategories: 'Général',
  userSettings: 'Mes paramètres',
  serverSettings: 'Personnes',
  categoryModal: 'Aperçu',
};

export function CategoryCaseSection() {
  const { prefs, setZone } = useCategoryCasePreferences();

  return (
    <section data-settings-section-id="category-typography" className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold mb-1">Typographie des catégories</h2>
        <p className="text-sm text-muted-foreground">
          Ce réglage est purement visuel de ton côté et te suit sur tous tes appareils.
          Il ne change pas les noms réels et n'est pas visible par les autres utilisateurs.
        </p>
      </div>

      <div className="space-y-2">
        {ZONE_ORDER.map((zone) => {
          const p = prefs[zone];
          return (
            <div
              key={zone}
              className="rounded-[10px] border border-border/50 bg-card/40 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{ZONE_LABELS[zone]}</div>
                  <div className={cn('text-xs text-muted-foreground mt-0.5', caseClass(zone, prefs))}>
                    Aperçu : {ZONE_PREVIEW[zone]}
                  </div>
                </div>
                <Switch
                  checked={p.enabled}
                  onCheckedChange={(v) => setZone(zone, { enabled: v })}
                />
              </div>

              <div className="flex items-center gap-1.5">
                {CASE_OPTIONS.map((opt) => {
                  const active = p.enabled && p.case === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!p.enabled}
                      onClick={() => setZone(zone, { case: opt.value })}
                      title={opt.hint}
                      className={cn(
                        'h-8 min-w-[40px] px-2 rounded-[10px] text-sm font-medium transition-colors duration-150 border',
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
    </section>
  );
}
