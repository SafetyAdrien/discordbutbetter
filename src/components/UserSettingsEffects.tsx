import { useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { DESKTOP_ZOOM_STEPS, isDesktopApp } from '@/lib/desktop';
import { setDesktopZoom } from '@/lib/desktopBridge';
import { ReminderModalHost } from '@/components/reminders/ReminderMenu';
import { LazyForwardMessageHost as ForwardMessageHost } from '@/components/lazy/LazyModals';
import { useReminderNotifier } from '@/hooks/useReminderNotifier';
import { useServerTagsRealtime } from '@/hooks/useServerTags';
import { useCustomStatusExpiry } from '@/hooks/useClearCustomStatus';

// Zoom reellement applique a la fenetre (elle demarre toujours a 100 %).
let appliedZoom = 100;
let zoomCommitTimer: ReturnType<typeof setTimeout> | undefined;

/*
 * Applique les parametres utilisateur a toute l'application via des
 * variables CSS et des classes sur <html> (regles dans index.css) :
 * taille du texte du chat, liens soulignes, saturation, contraste eleve,
 * densite, espacement des groupes de messages, mouvement reduit, spoilers,
 * reactions, variante de theme sombre.
 */
export function UserSettingsEffects() {
  useReminderNotifier();
  useServerTagsRealtime();
  useCustomStatusExpiry();
  const { settings } = useUserSettings();
  const a = settings.accessibility;
  const ap = settings.appearance;
  const { update } = useUserSettings();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--chat-font-size', `${a.font_size}px`);
    root.style.setProperty('--message-group-spacing', `${a.group_spacing}px`);
    root.style.setProperty('--app-saturation', String(a.saturation / 100));
    root.classList.toggle('a11y-underline-links', a.underline_links);
    root.classList.toggle('a11y-high-contrast', a.high_contrast);
    root.classList.toggle('a11y-desaturate', a.saturation < 100);
    root.classList.toggle('hide-reactions', !ap.show_reactions);
    root.dataset.density = a.density;
    root.dataset.spoilers = ap.spoilers;
    root.dataset.roleColors = a.role_colors;
    root.dataset.themeVariant = ap.theme_variant;
  }, [a, ap]);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => root.classList.toggle('reduce-motion', a.reduced_motion || (a.sync_reduced_motion && !!mq?.matches));
    apply();
    mq?.addEventListener?.('change', apply);
    return () => mq?.removeEventListener?.('change', apply);
  }, [a.reduced_motion, a.sync_reduced_motion]);

  // Zoom de l'application de bureau (fenetre Tauri) : applique le reglage et
  // gere Ctrl + « + » / « - » / « 0 », comme Discord. Un seul vrai zoom par
  // geste (apres 100 ms sans nouveau changement), sans aucun artifice visuel
  // par-dessus : ce que l'on voit est exactement le zoom choisi.
  useEffect(() => {
    if (!isDesktopApp) return;
    document.documentElement.style.setProperty('--desktop-zoom', String(a.zoom / 100));
    clearTimeout(zoomCommitTimer);
    zoomCommitTimer = setTimeout(() => {
      if (a.zoom === appliedZoom) return;
      appliedZoom = a.zoom;
      void setDesktopZoom(a.zoom / 100);
    }, 100);
  }, [a.zoom]);

  useEffect(() => {
    if (!isDesktopApp) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const steps = DESKTOP_ZOOM_STEPS;
      const idx = steps.findIndex((s) => s >= a.zoom);
      let next: number | null = null;
      if (e.key === '+' || e.key === '=') next = steps[Math.min(steps.length - 1, (steps[idx] === a.zoom ? idx : idx - 1) + 1)];
      else if (e.key === '-' || e.key === '_') next = steps[Math.max(0, (idx === -1 ? steps.length : idx) - 1)];
      else if (e.key === '0') next = 100;
      if (next === null) return;
      e.preventDefault();
      update({ accessibility: { zoom: next } });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [a.zoom, update]);

  return (
    <>
      <ReminderModalHost />
      <ForwardMessageHost />
    </>
  );
}
