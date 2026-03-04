/**
 * Simple client-side rate limiter to prevent spam and brute-force attacks.
 * This is a defense-in-depth measure — server-side limits should also be in place.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if an action is rate-limited.
 * @returns { allowed: boolean, retryAfterMs?: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  lockoutMs: number
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = store.get(key);

  // If locked out, check if lockout has expired
  if (entry?.lockedUntil) {
    if (now < entry.lockedUntil) {
      return { allowed: false, retryAfterMs: entry.lockedUntil - now };
    }
    // Lockout expired, reset
    store.delete(key);
  }

  if (!entry || now - entry.firstAttempt > windowMs) {
    // New window
    store.set(key, { count: 1, firstAttempt: now, lockedUntil: null });
    return { allowed: true };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    // Lock out
    entry.lockedUntil = now + lockoutMs;
    return { allowed: false, retryAfterMs: lockoutMs };
  }

  return { allowed: true };
}

/**
 * Simple cooldown check — ensures minimum time between actions.
 */
const cooldowns = new Map<string, number>();

export function checkCooldown(key: string, cooldownMs: number): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const lastAction = cooldowns.get(key);

  if (lastAction && now - lastAction < cooldownMs) {
    return { allowed: false, retryAfterMs: cooldownMs - (now - lastAction) };
  }

  cooldowns.set(key, now);
  return { allowed: true };
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
  cooldowns.delete(key);
}
