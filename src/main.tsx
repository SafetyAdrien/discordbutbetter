import { createRoot } from "react-dom/client";
import { warmCache, purgeAllCaches, enforceCacheSchemaVersionSync } from "./lib/cache";
import { logSelfXssRepeating, logSelfXssClosing } from "./lib/self-xss-warning";
import App from "./App.tsx";
import "./index.css";

// Synchronous schema purge BEFORE render — guarantees no stale data leaks
// into placeholders. IDB hydration runs in background via warmCache().
enforceCacheSchemaVersionSync();

// Kick off IDB hydration in background — does NOT block render.
void warmCache().catch((e) => {
  console.warn('[bootstrap] warmCache failed', e);
});

createRoot(document.getElementById("root")!).render(<App />);

// Self-XSS warning in the production DevTools console.
logSelfXssRepeating();
logSelfXssClosing();

/**
 * Hard-refresh shortcuts (Ctrl/Cmd+R, Ctrl/Cmd+Shift+R, Ctrl+F5) must wipe
 * every local cache layer so users always get the latest data + code after
 * a deploy. The browser will still perform the navigation; we just purge
 * caches first and then force a no-cache reload.
 */
if (typeof window !== "undefined") {
  let refreshing = false;

  const isRefreshShortcut = (e: KeyboardEvent): boolean => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return false;
    if (e.key === "r" || e.key === "R") return true;
    if (e.key === "F5") return true;
    return false;
  };

  // Named so HMR can remove it: a module-scope anonymous listener is never
  // torn down, so every hot reload stacked another copy onto `window`.
  const handleHardRefresh = (e: KeyboardEvent) => {
    if (!isRefreshShortcut(e)) return;
    if (refreshing) return;
    refreshing = true;
    e.preventDefault();
    e.stopPropagation();

    const reload = () => {
      try {
        // @ts-ignore
        window.location.reload(true);
      } catch {
        window.location.reload();
      }
    };

    Promise.resolve(purgeAllCaches())
      .catch(() => undefined)
      .finally(() => {
        try {
          if ("caches" in window) {
            caches
              .keys()
              .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
              .catch(() => undefined)
              .finally(reload);
            return;
          }
        } catch {}
        reload();
      });
  };

  window.addEventListener("keydown", handleHardRefresh, { capture: true });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener("keydown", handleHardRefresh, { capture: true });
    });
  }
}
