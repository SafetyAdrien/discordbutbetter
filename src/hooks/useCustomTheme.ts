/**
 * useCustomTheme — full state store for the custom theme feature.
 *
 * Two layers of state:
 *  - `committed`  : the theme that is actually persisted + applied to the DOM
 *  - `draft`      : the in-progress editor state, applied live to the DOM
 *                   but NOT persisted until the user hits "Appliquer"
 *
 * All DOM writes go straight to CSS custom properties via a rAF-throttled
 * writer so dragging sliders / color picker never re-renders React.
 * Persistence:
 *  - localStorage: instant, offline-first
 *  - Supabase `user_ui_preferences.custom_theme`: cross-device sync
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildPalette, type ThemeMode } from '@/lib/customTheme/palette';

const LOCAL_KEY = 'nexuschat:ui:customTheme';
const HTML_CLASS = 'custom-theme';

export type CustomThemeState = {
  enabled: boolean;
  chips: string[]; // 1–3 hex colors
  intensity: number; // 0–100
  angle: number; // 0–360
};

export const DEFAULT_CUSTOM_THEME: CustomThemeState = {
  enabled: false,
  chips: ['#5865F2'],
  intensity: 74,
  angle: 135,
};

type Snapshot = {
  committed: CustomThemeState;
  draft: CustomThemeState;
  isDirty: boolean;
};

function readLocal(): CustomThemeState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_CUSTOM_THEME;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CUSTOM_THEME, ...parsed };
  } catch {
    return DEFAULT_CUSTOM_THEME;
  }
}

function eq(a: CustomThemeState, b: CustomThemeState): boolean {
  return (
    a.enabled === b.enabled &&
    a.intensity === b.intensity &&
    a.angle === b.angle &&
    a.chips.length === b.chips.length &&
    a.chips.every((c, i) => c === b.chips[i])
  );
}

let snap: Snapshot = (() => {
  const c = readLocal();
  return { committed: c, draft: c, isDirty: false };
})();

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function persist() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(snap.committed)); } catch { /* noop */ }
}

/** rAF-throttled writer for the CSS custom properties. */
let rafId = 0;
function scheduleApply() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    applyToDom();
  });
}

/** Which state should drive the DOM: draft when editing, committed otherwise. */
function activeForDom(): CustomThemeState {
  return snap.isDirty ? snap.draft : snap.committed;
}

/** Track the CSS custom properties we wrote so we can cleanly revert. */
const appliedKeys = new Set<string>();

function currentMode(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function clearApplied(root: HTMLElement) {
  appliedKeys.forEach((k) => root.style.removeProperty(k));
  appliedKeys.clear();
  root.style.removeProperty('--ct-accent-gradient');
}

function applyToDom() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const active = activeForDom();
  // During editing (isDirty), preview the draft even if `enabled` is still false.
  const shouldRender = (active.enabled || snap.isDirty) && active.chips.length > 0;
  if (!shouldRender) {
    root.classList.remove(HTML_CLASS);
    clearApplied(root);
    return;
  }
  root.classList.add(HTML_CLASS);

  const palette = buildPalette(active.chips, active.intensity, currentMode());
  // Remove any previously applied keys that are no longer in the new palette.
  appliedKeys.forEach((k) => {
    if (!(k in palette)) root.style.removeProperty(k);
  });
  appliedKeys.clear();
  for (const name in palette) {
    root.style.setProperty(name, palette[name]);
    appliedKeys.add(name);
  }

  // Optional accent gradient variable for components that want a chip gradient.
  const stops = active.chips.length === 1
    ? `${active.chips[0]}, ${active.chips[0]}`
    : active.chips.join(', ');
  root.style.setProperty('--ct-accent-gradient', `linear-gradient(${active.angle}deg, ${stops})`);
}

/* ---------- Draft (editor) API ---------- */

export function setDraft(patch: Partial<CustomThemeState>) {
  const nextDraft = { ...snap.draft, ...patch };
  snap = { ...snap, draft: nextDraft, isDirty: !eq(nextDraft, snap.committed) };
  scheduleApply();
  emit();
}

export function setChip(i: number, hex: string) {
  const chips = [...snap.draft.chips];
  chips[i] = hex;
  setDraft({ chips });
}

export function addChip(hex?: string) {
  if (snap.draft.chips.length >= 3) return;
  const seed = hex ?? snap.draft.chips[snap.draft.chips.length - 1] ?? '#5865F2';
  setDraft({ chips: [...snap.draft.chips, seed] });
}

export function removeChip(i: number) {
  if (snap.draft.chips.length <= 1) return;
  setDraft({ chips: snap.draft.chips.filter((_, k) => k !== i) });
}

export function randomizeDraft() {
  const rand = () => {
    const h = Math.floor(Math.random() * 360);
    const s = 70;
    const l = 55;
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  const chipCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
  const chips: string[] = [];
  for (let i = 0; i < chipCount; i++) chips.push(rand());
  setDraft({
    enabled: true,
    chips,
    angle: Math.floor(Math.random() * 360),
    intensity: 45 + Math.floor(Math.random() * 40),
  });
}

/** Discard the in-progress draft. */
export function discardDraft() {
  if (!snap.isDirty) return;
  snap = { ...snap, draft: snap.committed, isDirty: false };
  scheduleApply();
  emit();
}

/** Apply the current draft as the committed theme + persist + sync. */
export function applyDraft() {
  if (!snap.isDirty) return;
  snap = { committed: snap.draft, draft: snap.draft, isDirty: false };
  persist();
  scheduleApply();
  emit();
  void syncToServer(snap.committed, { notifyOnError: true });
}


/** Restore defaults (committed + draft). */
export function resetCustomTheme() {
  snap = { committed: { ...DEFAULT_CUSTOM_THEME }, draft: { ...DEFAULT_CUSTOM_THEME }, isDirty: false };
  persist();
  scheduleApply();
  emit();
  void syncToServer(snap.committed);
}

/** Toggle enable on/off from outside the editor (banner switch). */
export function setCommittedEnabled(enabled: boolean) {
  if (snap.committed.enabled === enabled) return;
  const nextCommitted = { ...snap.committed, enabled };
  const nextDraft = snap.isDirty ? snap.draft : nextCommitted;
  snap = { committed: nextCommitted, draft: nextDraft, isDirty: snap.isDirty && !eq(nextDraft, nextCommitted) };
  persist();
  scheduleApply();
  emit();
  void syncToServer(snap.committed);
}

/** Apply an incoming shared theme (from a message link). Auto-commits. */
export function applySharedTheme(theme: { chips: string[]; angle: number; intensity: number }) {
  const next: CustomThemeState = {
    enabled: true,
    chips: theme.chips.slice(0, 3),
    angle: theme.angle,
    intensity: theme.intensity,
  };
  snap = { committed: next, draft: next, isDirty: false };
  persist();
  scheduleApply();
  emit();
  void syncToServer(next);
}

/* ---------- Server sync ---------- */

let currentUserId: string | null = null;

async function syncToServer(state: CustomThemeState, opts?: { notifyOnError?: boolean }) {
  if (!currentUserId) return;
  try {
    const { error } = await supabase
      .from('user_ui_preferences')
      .upsert(
        [{ user_id: currentUserId, custom_theme: state as unknown as never, updated_at: new Date().toISOString() }],
        { onConflict: 'user_id' },
      );
    if (error) throw error;
  } catch (err) {
    console.debug('[customTheme] sync failed', err);
    if (opts?.notifyOnError) {
      toast.error('Impossible d\'enregistrer votre thème', {
        description: 'Il reste actif localement — nouvelle tentative à la prochaine action.',
      });
    }
  }
}

/* ---------- Hook boilerplate ---------- */

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function getSnap(): Snapshot { return snap; }

/** Read-only snapshot for consumers. */
export function useCustomThemeSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}

/** Legacy compat: returns the committed state as before. */
export function useCustomTheme(): CustomThemeState {
  const s = useSyncExternalStore(subscribe, getSnap, getSnap);
  return s.isDirty ? s.draft : s.committed;
}

export function getCustomTheme(): CustomThemeState {
  return snap.committed;
}

/** Mount once at the app root: applies DOM, sets up sync + visibility. */
export function useMountCustomTheme() {
  const { user } = useAuth();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));
  useEffect(() => {
    applyToDom();
    const onVis = () => {
      const active = activeForDom();
      if (document.hidden && active.enabled) {
        document.documentElement.classList.remove(HTML_CLASS);
      } else if (!document.hidden && active.enabled) {
        document.documentElement.classList.add(HTML_CLASS);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    // Re-derive the palette whenever the light/dark class flips.
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' && r.attributeName === 'class') {
          scheduleApply();
          break;
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      mo.disconnect();
    };
  }, []);

  // Cross-device sync via Supabase
  useEffect(() => {
    if (!user?.id) { currentUserId = null; return; }
    currentUserId = user.id;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_ui_preferences')
        .select('custom_theme')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const remote = (data?.custom_theme ?? null) as Partial<CustomThemeState> | null;
      if (remote && typeof remote === 'object') {
        const merged: CustomThemeState = { ...DEFAULT_CUSTOM_THEME, ...remote };
        // Only overwrite if different, and never clobber a local dirty draft.
        if (!eq(merged, snap.committed)) {
          snap = { committed: merged, draft: snap.isDirty ? snap.draft : merged, isDirty: snap.isDirty };
          persist();
          scheduleApply();
          emit();
        }
      }
    })();

    const channel = supabase
      .channel(`user_ui_prefs_ct:${user.id}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_ui_preferences', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { custom_theme?: Partial<CustomThemeState> | null } | null;
          const remote = row?.custom_theme;
          if (remote && typeof remote === 'object') {
            const merged: CustomThemeState = { ...DEFAULT_CUSTOM_THEME, ...remote };
            if (!eq(merged, snap.committed)) {
              snap = { committed: merged, draft: snap.isDirty ? snap.draft : merged, isDirty: snap.isDirty };
              persist();
              scheduleApply();
              emit();
            }
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}

/* ---------- Legacy helpers kept for existing imports ---------- */

/** @deprecated Use setDraft + applyDraft, or setCommittedEnabled/applySharedTheme. */
export function setCustomTheme(patch: Partial<CustomThemeState>, _options?: { persist?: boolean }) {
  const next = { ...snap.committed, ...patch };
  snap = { committed: next, draft: next, isDirty: false };
  persist();
  scheduleApply();
  emit();
  void syncToServer(next);
}

/** @deprecated Use randomizeDraft + applyDraft in the editor flow. */
export function randomizeCustomTheme() {
  randomizeDraft();
  applyDraft();
}
