/**
 * IndexedDB cache layer with synchronous localStorage + in-memory fallback.
 * 
 * Architecture:
 * - In-memory Map for instant synchronous reads during runtime
 * - localStorage mirror for instant synchronous reads on cold boot
 * - IndexedDB for persistent bulk storage
 * - warmCache() hydrates IDB entries into memory in background
 * - cacheSetAsync() writes to memory + localStorage + IndexedDB
 * - cacheGetSync() reads from memory first, then localStorage mirror
 */

const DB_NAME = 'nexuschat-cache';
const STORE_NAME = 'kv';
const DB_VERSION = 1;
const SYNC_STORAGE_PREFIX = `${DB_NAME}:${STORE_NAME}:`;

/**
 * Bump this whenever you need to force every client to drop their local cache
 * on next load. We persist the last-seen version in localStorage; on mismatch
 * we wipe memory + localStorage mirror + IndexedDB before warmCache() runs.
 */
const CACHE_SCHEMA_VERSION = 6;
const CACHE_VERSION_KEY = `${DB_NAME}:schema-version`;

/**
 * Cache readiness gate: resolves only AFTER the schema-version purge has run
 * (and IDB has been warmed). Every message-rendering hook must await this
 * before issuing its query so we never paint stale rows from a previous schema.
 */
let cacheReadyResolve: () => void;
const cacheReadyPromise = new Promise<void>((resolve) => {
  cacheReadyResolve = resolve;
});
let cacheReadyFlag = false;
const cacheReadyListeners = new Set<() => void>();

export function isCacheReady(): boolean {
  return cacheReadyFlag;
}

export function whenCacheReady(): Promise<void> {
  return cacheReadyPromise;
}

export function subscribeCacheReady(listener: () => void): () => void {
  cacheReadyListeners.add(listener);
  return () => cacheReadyListeners.delete(listener);
}

function markCacheReady(): void {
  if (cacheReadyFlag) return;
  cacheReadyFlag = true;
  cacheReadyResolve();
  cacheReadyListeners.forEach((l) => {
    try { l(); } catch {}
  });
}

const memoryCache = new Map<string, any>();

let dbPromise: Promise<IDBDatabase> | null = null;
let idbAvailable = true;

function getSyncStorageKey(key: string): string {
  return `${SYNC_STORAGE_PREFIX}${key}`;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readSyncMirror<T = any>(key: string): T | undefined {
  if (!canUseLocalStorage()) return undefined;

  try {
    const raw = window.localStorage.getItem(getSyncStorageKey(key));
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeSyncMirror(key: string, value: any): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(getSyncStorageKey(key), JSON.stringify(value));
  } catch {
    // Ignore quota or serialization errors — memory/IDB still work
  }
}

function deleteSyncMirror(key: string): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.removeItem(getSyncStorageKey(key));
  } catch {}
}

function deleteSyncMirrorByPrefix(prefix: string): void {
  if (!canUseLocalStorage()) return;

  try {
    const fullPrefix = getSyncStorageKey(prefix);
    const keysToDelete: string[] = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}

function clearSyncMirror(): void {
  if (!canUseLocalStorage()) return;

  try {
    const keysToDelete: string[] = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(SYNC_STORAGE_PREFIX)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        idbAvailable = false;
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      // Safety: some mobile browsers (iOS private mode, PWA edge cases) never
      // fire onsuccess/onerror — bail out after 2s so warmCache can proceed.
      const timeout = setTimeout(() => {
        idbAvailable = false;
        reject(new Error('IndexedDB open timed out'));
      }, 2000);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => { clearTimeout(timeout); resolve(request.result); };
      request.onerror = () => {
        clearTimeout(timeout);
        idbAvailable = false;
        reject(request.error);
      };
      request.onblocked = () => {
        clearTimeout(timeout);
        idbAvailable = false;
        reject(new Error('IndexedDB blocked'));
      };
    } catch (e) {
      idbAvailable = false;
      reject(e);
    }
  });
  return dbPromise;
}

/**
 * Wipe every cache layer (memory, localStorage mirror, IndexedDB store).
 * Resolves once IDB is cleared so warmCache() can safely run afterwards.
 */
export async function purgeAllCaches(): Promise<void> {
  memoryCache.clear();
  clearSyncMirror();

  if (!idbAvailable) return;

  try {
    const db = await getDB();
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // ignore
  }
}

/**
 * On cold boot, drop every cache layer if the persisted schema version is
 * older than CACHE_SCHEMA_VERSION. After purging, we also clear browser
 * Cache Storage (service worker / fetch caches) and trigger a one-shot
 * auto-reload so the running session immediately picks up the latest JS
 * bundle + freshly refetched data without requiring the user to refresh.
 * A sessionStorage guard prevents reload loops.
 */
const AUTO_RELOAD_GUARD_KEY = `${DB_NAME}:auto-reload-done`;

async function enforceCacheSchemaVersion(): Promise<void> {
  if (!canUseLocalStorage()) return;

  try {
    const stored = window.localStorage.getItem(CACHE_VERSION_KEY);
    const storedVersion = stored ? parseInt(stored, 10) : 0;
    if (storedVersion >= CACHE_SCHEMA_VERSION) return;

    await purgeAllCaches();
    window.localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_SCHEMA_VERSION));

    // Clear Cache Storage too (service worker / HTTP fetch caches).
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    }

    // First-time migration this session → force one reload so the running
    // app instantly renders with the new layout/data instead of waiting for
    // the user to manually refresh.
    try {
      const guard = window.sessionStorage.getItem(AUTO_RELOAD_GUARD_KEY);
      if (!guard && storedVersion > 0) {
        window.sessionStorage.setItem(AUTO_RELOAD_GUARD_KEY, '1');
        window.location.reload();
        // Block further boot until the reload happens.
        await new Promise(() => {});
      }
    } catch {
      // ignore — fall through to normal boot
    }
  } catch {
    // ignore
  }
}


/**
 * Warm the in-memory cache from IndexedDB.
 * Call this once on app startup; it now runs in background.
 * If the persisted cache schema version is out of date, every cache layer
 * is wiped first so users always pull fresh data after a deploy.
 */
export async function warmCache(): Promise<void> {
  const { markPerf, measurePerf, recordPerf } = await import('@/lib/perf');
  markPerf('warmCache:start');

  // Step 1 (BLOCKING, very fast): ensure the schema-version purge ran.
  try {
    const t0 = performance.now();
    await enforceCacheSchemaVersion();
    recordPerf('warmCache:schemaEnforce', performance.now() - t0);
  } catch {
    // ignore
  }

  // Step 2 (BLOCKING with 1200ms safety cap): hydrate IndexedDB into memory
  // BEFORE marking the cache ready. Otherwise every `cacheGetSync()` issued by
  // message/DM/server hooks at first paint returns `undefined` and we lose
  // instant rendering on mobile (localStorage mirror often hits quota).
  const HYDRATE_CAP_MS = 1200;
  const hydrateStart = performance.now();

  const hydratePromise = (async () => {
    try {
      const db = await getDB();
      let count = 0;
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            memoryCache.set(cursor.key as string, cursor.value);
            count += 1;
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      recordPerf(`warmCache:idbHydrate(${count})`, performance.now() - hydrateStart);
    } catch {
      recordPerf('warmCache:idbHydrate(failed)', performance.now() - hydrateStart);
    }
  })();

  await Promise.race([
    hydratePromise,
    new Promise<void>((resolve) => setTimeout(() => {
      recordPerf('warmCache:idbHydrate(timeout)', performance.now() - hydrateStart);
      resolve();
    }, HYDRATE_CAP_MS)),
  ]);

  markCacheReady();
  markPerf('warmCache:ready');
  measurePerf('warmCache:total(blocking)', 'warmCache:start', 'warmCache:ready');
}

/**
 * Synchronous read from in-memory cache, with localStorage cold-boot fallback.
 */
export function cacheGetSync<T = any>(key: string): T | undefined {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T | undefined;
  }

  const mirrored = readSyncMirror<T>(key);
  if (mirrored !== undefined) {
    memoryCache.set(key, mirrored);
    return mirrored;
  }

  return undefined;
}

/**
 * Write to memory + sync mirror immediately, IndexedDB in background.
 */
export function cacheSetAsync(key: string, value: any): void {
  memoryCache.set(key, value);
  writeSyncMirror(key, value);

  if (!idbAvailable) return;

  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
    } catch {
      // Memory + sync mirror stay valid
    }
  }).catch(() => {});
}

/**
 * Delete a key from all cache layers.
 */
export function cacheDelete(key: string): void {
  memoryCache.delete(key);
  deleteSyncMirror(key);

  if (!idbAvailable) return;

  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    } catch {}
  }).catch(() => {});
}

/**
 * Delete all keys matching a prefix from all cache layers.
 */
export function cacheDeleteByPrefix(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }

  deleteSyncMirrorByPrefix(prefix);

  if (!idbAvailable) return;

  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch {}
  }).catch(() => {});
}

/**
 * Clear all cache entries.
 */
export function cacheClear(): void {
  memoryCache.clear();
  clearSyncMirror();

  if (!idbAvailable) return;

  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {}
  }).catch(() => {});
}

/**
 * Get the number of cached entries (memory).
 */
export function cacheSize(): number {
  return memoryCache.size;
}
