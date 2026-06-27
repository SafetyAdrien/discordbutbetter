/**
 * Cross-hook guard used by mark-as-read and the realtime listeners that
 * recompute channel/DM unread badges. It records, per channel/conversation,
 * the client-side wall-clock moment at which the user marked the room as
 * read, so any realtime INSERT or refetch that surfaces older content can be
 * safely ignored instead of resurrecting a stale badge (the documented race).
 *
 * Stored as a `number` (epoch ms) keyed by id; the room's own state machine
 * (new INSERT after the guard) is what re-arms unread, not a refetch.
 */
const guard = new Map<string, number>();

export function markReadGuard(id: string, at: number = Date.now()) {
  guard.set(id, at);
}

export function isBeforeReadGuard(id: string, isoOrMs: string | number | null | undefined): boolean {
  const g = guard.get(id);
  if (!g) return false;
  if (isoOrMs == null) return false;
  const t = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs);
  if (!Number.isFinite(t)) return false;
  // A small slack absorbs trivial client/server clock skew without letting
  // genuinely-new messages slip past the guard.
  return t <= g + 1500;
}

export function clearReadGuard(id: string) {
  guard.delete(id);
}

/**
 * Cross-device last_read_at registry (in-memory, monotone).
 * Arbitrates realtime events on channel_read_states / dm_read_states so a
 * stale or replayed event from another device cannot rewind a more recent
 * local read. Distinct from `guard` above which filters message INSERTs
 * older than a same-device read.
 *
 * Monotone: recordReadAt never lowers the stored value. Cleared on reload —
 * authoritative state is rebuilt by the queryFn at that point.
 */
const lastReadAtMap = new Map<string, number>();

export function recordReadAt(id: string, atMs: number): boolean {
  if (!Number.isFinite(atMs)) return false;
  const current = lastReadAtMap.get(id) ?? 0;
  if (atMs <= current) return false;
  lastReadAtMap.set(id, atMs);
  return true;
}

export function getLastReadAt(id: string): number | undefined {
  return lastReadAtMap.get(id);
}
