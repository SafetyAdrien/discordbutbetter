import type { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeSubscribeCallback = Parameters<RealtimeChannel['subscribe']>[0];

const sharedEffects = new Map<string, { users: number; cleanup: () => void }>();

export function acquireSharedRealtimeEffect(key: string, setup: () => () => void): () => void {
  const existing = sharedEffects.get(key);
  if (existing) {
    existing.users += 1;
  } else {
    sharedEffects.set(key, { users: 1, cleanup: setup() });
  }

  return () => {
    const effect = sharedEffects.get(key);
    if (!effect) return;
    effect.users -= 1;
    if (effect.users === 0) {
      sharedEffects.delete(key);
      effect.cleanup();
    }
  };
}

export function subscribeWithDiagnostics(
  channel: RealtimeChannel,
  label: string,
  onStatus?: RealtimeSubscribeCallback,
): () => void {
  let active = true;
  console.info(`[Realtime] ${new Date().toISOString()} ${label}: subscribing`);

  channel.subscribe((status, error) => {
    if (!active) return;

    const log = status === 'SUBSCRIBED' ? console.info : console.warn;
    log(
      `[Realtime] ${new Date().toISOString()} ${label}: ${status}`,
      error ? { name: error.name, message: error.message } : undefined,
    );
    onStatus?.(status, error);
  });

  return () => {
    active = false;
  };
}
