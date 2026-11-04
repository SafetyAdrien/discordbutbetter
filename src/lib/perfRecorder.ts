import { toast } from 'sonner';

/*
 * Enregistreur de performance a lancer sur un vrai compte : Alt+Maj+R demarre, Alt+Maj+R arrete
 * et copie un rapport compact dans le presse-papiers. Il mesure (sans rien modifier) :
 *  - les images trop longues (> 50 ms) avec l'action de l'utilisateur juste avant,
 *  - les requetes reseau lentes et les plus frequentes,
 *  - la taille du DOM et la memoire.
 */
interface Frame { at: number; ms: number; trigger: string }

let running = false;
let startedAt = 0;
let raf = 0;
let frames: Frame[] = [];
let lastTrigger = { at: 0, label: 'aucune action' };
let cleanup: Array<() => void> = [];
interface DesktopPerf { perfStart?: () => Promise<boolean>; perfStop?: () => Promise<{ js: string[]; engine: string[]; longest: string[] } | null> }
const desktopPerf = () => (window as unknown as { desktop?: DesktopPerf }).desktop;

const label = (el: Element | null) => {
  if (!el) return '?';
  const h = el as HTMLElement;
  const t = (h.getAttribute('aria-label') || h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  return `${el.tagName.toLowerCase()}${t ? ` « ${t} »` : ''}`;
};

export function isRecordingPerf() { return running; }

export function startPerfRecording() {
  if (running) return;
  running = true;
  startedAt = performance.now();
  frames = [];
  performance.clearResourceTimings();
  void desktopPerf()?.perfStart?.();
  const onEvt = (e: Event) => { lastTrigger = { at: performance.now(), label: `${e.type} sur ${label(e.target as Element)}` }; };
  for (const t of ['click', 'keydown', 'pointerdown', 'wheel', 'input']) { window.addEventListener(t, onEvt, true); cleanup.push(() => window.removeEventListener(t, onEvt, true)); }
  let last = performance.now();
  const tick = (n: number) => {
    const d = n - last;
    if (d > 50) frames.push({ at: n - startedAt, ms: d, trigger: n - lastTrigger.at < 1500 ? lastTrigger.label : 'sans action recente' });
    last = n;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  toast.info('Enregistrement des performances démarré', { description: 'Utilise l\'app normalement, puis Alt+Maj+R pour arrêter et copier le rapport.' });
}

export async function stopPerfRecording() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(raf);
  cleanup.forEach((f) => f());
  cleanup = [];
  const engine = await desktopPerf()?.perfStop?.().catch(() => null);
  const secs = (performance.now() - startedAt) / 1000;
  const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const api = res.filter((r) => /supabase|functions|rest\/v1|realtime/.test(r.name));
  const byEndpoint = new Map<string, { n: number; total: number; max: number }>();
  for (const r of api) {
    const key = r.name.replace(/^https?:\/\/[^/]+/, '').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id').split('?')[0];
    const e = byEndpoint.get(key) ?? { n: 0, total: 0, max: 0 };
    e.n++; e.total += r.duration; e.max = Math.max(e.max, r.duration);
    byEndpoint.set(key, e);
  }
  const worstFrames = [...frames].sort((a, b) => b.ms - a.ms).slice(0, 12);
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const lines = [
    `# Rapport de performance (${secs.toFixed(0)} s)`,
    `DOM : ${document.querySelectorAll('*').length} éléments${mem ? ` · mémoire JS ${(mem.usedJSHeapSize / 1048576).toFixed(0)} Mo` : ''} · zoom ${window.devicePixelRatio}`,
    `Images > 50 ms : ${frames.length} (pire ${worstFrames[0] ? worstFrames[0].ms.toFixed(0) : 0} ms)`,
    ...worstFrames.map((f) => `  - ${f.ms.toFixed(0)} ms à ${(f.at / 1000).toFixed(1)} s ← ${f.trigger}`),
    `Requêtes API : ${api.length}`,
    ...[...byEndpoint.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 12).map(([k, v]) => `  - ${v.n}× ${k} · total ${v.total.toFixed(0)} ms · max ${v.max.toFixed(0)} ms`),
    ...(engine ? ['Profil JavaScript (temps propre) :', ...engine.js.map((l) => `  - ${l}`), 'Moteur (cumul) :', ...engine.engine.map((l) => `  - ${l}`), 'Plus longs blocs :', ...engine.longest.map((l) => `  - ${l}`)] : []),
  ].join('\n');
  try { await navigator.clipboard.writeText(lines); toast.success('Rapport copié', { description: 'Colle-le dans la conversation.' }); }
  catch { toast.error('Copie impossible', { description: 'Rapport affiché dans la console (F12).' }); }
  // eslint-disable-next-line no-console
  console.log(lines);
}

export function togglePerfRecording() { return running ? stopPerfRecording() : startPerfRecording(); }
