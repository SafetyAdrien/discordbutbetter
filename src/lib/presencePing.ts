import { supabase } from '@/integrations/supabase/client';

/*
 * Signal instantane "le profil X vient de changer" (statut, statut personnalise, activite).
 * L'emetteur le diffuse des que la base a accepte la mise a jour ; les autres clients ne font
 * pas confiance au contenu : ils relisent la ligne du profil (protegee par les droits d'acces) et
 * l'appliquent. Cela evite d'attendre la livraison des changements de table (verification des
 * droits pour chaque abonne), qui peut prendre plusieurs secondes.
 */
const TOPIC = 'presence-ping';
const WATCHED = ['status', 'custom_status', 'activity_type', 'activity_text', 'manual_status'];

type Listener = (userId: string) => void;
const listeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let ready = false;

function ensure() {
  if (channel) return channel;
  channel = supabase
    .channel(TOPIC, { config: { broadcast: { self: false, ack: false } } })
    .on('broadcast', { event: 'ping' }, ({ payload }) => {
      const id = (payload as { id?: string } | null)?.id;
      if (id) listeners.forEach((l) => l(id));
    })
    .subscribe((s) => { ready = s === 'SUBSCRIBED'; });
  return channel;
}

export function subscribePresencePing(l: Listener): () => void {
  listeners.add(l);
  ensure();
  return () => { listeners.delete(l); };
}

/** A appeler apres une mise a jour reussie de la table profiles. */
export function notifyProfileChanged(userId: string, patch: Record<string, unknown>) {
  if (!Object.keys(patch).some((k) => WATCHED.includes(k))) return;
  const ch = ensure();
  const send = () => void ch.send({ type: 'broadcast', event: 'ping', payload: { id: userId } }).catch(() => undefined);
  if (ready) send(); else setTimeout(send, 300);
}

type LocalListener = (userId: string, patch: Record<string, unknown>) => void;
const localListeners = new Set<LocalListener>();
export function subscribeLocalProfilePatch(l: LocalListener): () => void {
  localListeners.add(l);
  return () => { localListeners.delete(l); };
}
/** Applique tout de suite un changement de profil aux caches locaux (liste des membres, amis...). */
export function applyLocalProfilePatch(userId: string, patch: Record<string, unknown>) {
  localListeners.forEach((l) => l(userId, patch));
}
