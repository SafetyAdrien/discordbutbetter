/**
 * Client-only text-transform preferences for category-like labels.
 * Persisted per-user via `public.user_ui_preferences` (see useCategoryCasePreferences).
 * Purely visual — the underlying data is never mutated, so other users are not affected.
 */

export type CaseValue = 'upper' | 'lower' | 'title' | 'none';

export type CategoryCaseZone =
  | 'channelCategories'
  | 'userSettings'
  | 'serverSettings'
  | 'categoryModal'
  | 'profileEdit';

export interface ZonePref {
  enabled: boolean;
  case: CaseValue;
}

export type CategoryCasePrefs = Record<CategoryCaseZone, ZonePref>;

export const DEFAULT_ZONE_PREF: ZonePref = { enabled: false, case: 'none' };

export const DEFAULT_CATEGORY_CASE_PREFS: CategoryCasePrefs = {
  channelCategories: { ...DEFAULT_ZONE_PREF },
  userSettings: { ...DEFAULT_ZONE_PREF },
  serverSettings: { ...DEFAULT_ZONE_PREF },
  categoryModal: { ...DEFAULT_ZONE_PREF },
  profileEdit: { ...DEFAULT_ZONE_PREF },
};

export const ZONE_LABELS: Record<CategoryCaseZone, string> = {
  channelCategories: 'Catégories de salons',
  userSettings: 'Sections des paramètres utilisateur',
  serverSettings: 'Sections des paramètres serveur',
  categoryModal: 'Onglets du modal de catégorie',
  profileEdit: "Libellés d'édition du profil",
};

export const CASE_OPTIONS: Array<{ value: CaseValue; label: string; hint: string }> = [
  { value: 'upper', label: 'AG', hint: 'MAJUSCULES' },
  { value: 'lower', label: 'ag', hint: 'minuscules' },
  { value: 'title', label: 'Ag', hint: 'Capitalisé' },
  { value: 'none', label: 'Aa', hint: 'Original' },
];

/** Returns the tailwind class matching a zone's active case, or empty string when disabled. */
export function caseClass(zone: CategoryCaseZone, prefs: CategoryCasePrefs | null | undefined): string {
  const p = prefs?.[zone];
  if (!p || !p.enabled) return 'normal-case';
  switch (p.case) {
    case 'upper': return 'uppercase';
    case 'lower': return 'lowercase';
    case 'title': return 'capitalize';
    default: return 'normal-case';
  }
}

export function normalizePrefs(raw: unknown): CategoryCasePrefs {
  const out: CategoryCasePrefs = {
    channelCategories: { ...DEFAULT_ZONE_PREF },
    userSettings: { ...DEFAULT_ZONE_PREF },
    serverSettings: { ...DEFAULT_ZONE_PREF },
    categoryModal: { ...DEFAULT_ZONE_PREF },
    profileEdit: { ...DEFAULT_ZONE_PREF },
  };
  if (!raw || typeof raw !== 'object') return out;
  const rec = raw as Record<string, unknown>;
  (Object.keys(out) as CategoryCaseZone[]).forEach((z) => {
    const entry = rec[z] as Partial<ZonePref> | undefined;
    if (entry && typeof entry === 'object') {
      out[z] = {
        enabled: Boolean(entry.enabled),
        case: (['upper', 'lower', 'title', 'none'] as CaseValue[]).includes(entry.case as CaseValue)
          ? (entry.case as CaseValue)
          : 'none',
      };
    }
  });
  return out;
}
