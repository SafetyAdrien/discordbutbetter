import { useEffect, useState } from 'react';
import { clearPerf, getPerfReport, subscribePerf, type PerfEntry } from '@/lib/perf';

/**
 * Floating diagnostics overlay listing recent perf measurements.
 *
 * Toggle visibility with Ctrl+Shift+P, or open automatically by adding
 * `?perf=1` to the URL. Pointer-events are confined to the panel so the
 * rest of the app stays interactive.
 */
export function PerfOverlay() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return new URLSearchParams(window.location.search).get('perf') === '1';
    } catch {
      return false;
    }
  });
  const [entries, setEntries] = useState<PerfEntry[]>(() => getPerfReport());

  // Subscribe to perf buffer updates
  useEffect(() => {
    if (!open) return;
    setEntries(getPerfReport());
    const unsub = subscribePerf(() => setEntries(getPerfReport()));
    return () => { unsub(); };
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true } as any);
  }, []);

  if (!open) return null;

  const sorted = entries.slice().sort((a, b) => b.startedAt - a.startedAt).slice(0, 40);

  return (
    <div
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 2147483646,
        width: 360,
        maxHeight: '60vh',
        background: 'hsl(var(--popover, 0 0% 8%))',
        color: 'hsl(var(--foreground, 0 0% 95%))',
        border: '1px solid hsl(var(--border, 0 0% 20%))',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 11,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: '1px solid hsl(var(--border, 0 0% 20%))',
          background: 'hsl(var(--muted, 0 0% 14%))',
        }}
      >
        <strong style={{ letterSpacing: 0.4 }}>perf · {entries.length}</strong>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => clearPerf()}
            style={btnStyle}
          >
            clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={btnStyle}
            aria-label="Close"
          >
            ×
          </button>
        </span>
      </header>
      <div style={{ overflow: 'auto', padding: '4px 8px' }}>
        {sorted.length === 0 ? (
          <div style={{ opacity: 0.6, padding: '8px 2px' }}>No measurements yet…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid hsl(var(--border, 0 0% 20%) / 0.5)' }}>
                  <td style={{ padding: '2px 4px', wordBreak: 'break-all' }}>{e.label}</td>
                  <td
                    style={{
                      padding: '2px 4px',
                      textAlign: 'right',
                      color: e.slow ? '#f87171' : e.duration > 100 ? '#fbbf24' : '#86efac',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {e.duration.toFixed(1)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <footer style={{ padding: '4px 10px', borderTop: '1px solid hsl(var(--border, 0 0% 20%))', opacity: 0.6 }}>
        Ctrl+Shift+P to toggle · window.__perfReport()
      </footer>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'inherit',
  border: '1px solid hsl(var(--border, 0 0% 30%))',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
