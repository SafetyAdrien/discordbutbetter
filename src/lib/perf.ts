/**
 * Lightweight performance instrumentation.
 *
 * - `markPerf(name)` writes a `performance.mark`
 * - `measurePerf(label, start, end?)` writes a `performance.measure` and
 *   buffers `{ label, duration }` in memory for the diagnostics overlay.
 * - `timeAsync(label, fn)` wraps an async function with a start/end measure.
 * - Measurements above `SLOW_MS` are logged to the console with a warning
 *   so devs immediately see where the bottleneck is.
 * - `getPerfReport()` returns the in-memory buffer (used by the overlay).
 * - `window.__perfReport()` prints a console.table snapshot, available at
 *   any time without opening the overlay.
 */

const BUFFER_MAX = 200;
const SLOW_MS = 500;

export interface PerfEntry {
  label: string;
  duration: number;
  startedAt: number;
  slow: boolean;
}

const buffer: PerfEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => {
    try { l(); } catch {}
  });
}

function pushEntry(entry: PerfEntry) {
  buffer.push(entry);
  if (buffer.length > BUFFER_MAX) buffer.splice(0, buffer.length - BUFFER_MAX);
  if (entry.slow) {
    // eslint-disable-next-line no-console
    console.warn(`[perf] ⚠ slow: ${entry.label} = ${entry.duration.toFixed(1)}ms`);
  }
  notify();
}

function hasPerf(): boolean {
  return typeof performance !== 'undefined' && typeof performance.mark === 'function';
}

export function markPerf(name: string): void {
  if (!hasPerf()) return;
  try { performance.mark(name); } catch {}
}

export function measurePerf(label: string, startMark: string, endMark?: string): number {
  if (!hasPerf()) return 0;
  try {
    const m = endMark
      ? performance.measure(label, startMark, endMark)
      : performance.measure(label, startMark);
    const duration = m.duration ?? 0;
    pushEntry({
      label,
      duration,
      startedAt: m.startTime ?? performance.now(),
      slow: duration >= SLOW_MS,
    });
    return duration;
  } catch {
    return 0;
  }
}

export async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!hasPerf()) return fn();
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - t0;
    pushEntry({
      label,
      duration,
      startedAt: t0,
      slow: duration >= SLOW_MS,
    });
  }
}

export function timeSync<T>(label: string, fn: () => T): T {
  if (!hasPerf()) return fn();
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - t0;
    pushEntry({
      label,
      duration,
      startedAt: t0,
      slow: duration >= SLOW_MS,
    });
  }
}

export function recordPerf(label: string, duration: number, startedAt = performance.now() - duration): void {
  pushEntry({ label, duration, startedAt, slow: duration >= SLOW_MS });
}

export function getPerfReport(): PerfEntry[] {
  return buffer.slice();
}

export function subscribePerf(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function clearPerf(): void {
  buffer.length = 0;
  notify();
}

// Expose a console helper for ad-hoc inspection without the overlay.
if (typeof window !== 'undefined') {
  (window as any).__perfReport = () => {
    // eslint-disable-next-line no-console
    console.table(
      buffer.map((e) => ({
        label: e.label,
        ms: Number(e.duration.toFixed(1)),
        slow: e.slow,
      })),
    );
    return buffer.slice();
  };
}
