/**
 * IndexedDB cache layer with synchronous in-memory fallback.
 * 
 * Architecture:
 * - In-memory Map for synchronous reads (used by placeholderData)
 * - IndexedDB for persistent storage (survives browser restarts, no 5MB limit)
 * - warmCache() loads all IDB entries into memory on app start
 * - cacheSetAsync() writes to both memory + IDB
 * - cacheGetSync() reads from memory only (instant)
 */

const DB_NAME = 'nexuschat-cache';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

// In-memory sync cache
const memoryCache = new Map<string, any>();

let dbPromise: Promise<IDBDatabase> | null = null;
let idbAvailable = true;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        idbAvailable = false;
        reject(request.error);
      };
    } catch (e) {
      idbAvailable = false;
      reject(e);
    }
  });
  return dbPromise;
}

/**
 * Warm the in-memory cache from IndexedDB.
 * Call this once on app startup (before rendering).
 * Returns quickly — typically < 50ms for hundreds of entries.
 */
export async function warmCache(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          memoryCache.set(cursor.key as string, cursor.value);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // IDB unavailable (private browsing, etc.) — memory cache still works for session
  }
}

/**
 * Synchronous read from in-memory cache.
 * Used by placeholderData in react-query hooks.
 */
export function cacheGetSync<T = any>(key: string): T | undefined {
  return memoryCache.get(key) as T | undefined;
}

/**
 * Write to both in-memory cache and IndexedDB (async, fire-and-forget).
 * The memory write is synchronous, IDB write is background.
 */
export function cacheSetAsync(key: string, value: any): void {
  memoryCache.set(key, value);

  if (!idbAvailable) return;

  // Fire-and-forget IDB write
  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
    } catch {
      // Quota exceeded or other error — memory cache still valid
    }
  }).catch(() => {});
}

/**
 * Delete a key from both caches.
 */
export function cacheDelete(key: string): void {
  memoryCache.delete(key);

  if (!idbAvailable) return;

  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    } catch {}
  }).catch(() => {});
}

/**
 * Delete all keys matching a prefix from both caches.
 */
export function cacheDeleteByPrefix(prefix: string): void {
  // Memory
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }

  if (!idbAvailable) return;

  // IDB
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
