import { createRoot } from "react-dom/client";
import { warmCache, purgeAllCaches } from "./lib/cache";
import App from "./App.tsx";
import "./index.css";

async function bootstrap() {
  await warmCache();
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();

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
    // Ctrl/Cmd + R  (with or without Shift)
    if (e.key === "r" || e.key === "R") return true;
    // Ctrl + F5
    if (e.key === "F5") return true;
    return false;
  };

  window.addEventListener(
    "keydown",
    (e) => {
      if (!isRefreshShortcut(e)) return;
      if (refreshing) return;
      refreshing = true;
      e.preventDefault();
      e.stopPropagation();

      const reload = () => {
        try {
          // Bypass HTTP cache where supported
          // @ts-ignore - legacy forceReload arg still honored by some engines
          window.location.reload(true);
        } catch {
          window.location.reload();
        }
      };

      // Purge IndexedDB + localStorage mirror + in-memory cache, then reload.
      Promise.resolve(purgeAllCaches())
        .catch(() => undefined)
        .finally(() => {
          // Also clear Cache Storage (service worker / fetch caches) if present
          try {
            if ("caches" in window) {
              caches
                .keys()
                .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                .catch(() => undefined)
                .finally(reload);
              return;
            }
          } catch {
            // ignore
          }
          reload();
        });
    },
    { capture: true }
  );
}
