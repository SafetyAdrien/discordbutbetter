import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useReminders, useNow } from '@/hooks/useReminders';
import { OPEN_SERVER_EVENT } from '@/lib/invites';

/*
 * Annonce un rappel quand son heure arrive (une seule fois par rappel et par session) : message dans l'app avec
 * "Voir", et notification systeme si l'autorisation a deja ete accordee. Le point rouge de la boite de reception et
 * "N rappel en retard" restent affiches jusqu'a la suppression du rappel.
 */
export function useReminderNotifier() {
  const { data = [] } = useReminders();
  const now = useNow(10_000);
  const announced = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const r of data) {
      if (announced.current.has(r.id) || new Date(r.remind_at) > now) continue;
      announced.current.add(r.id);
      // Un rappel deja tres en retard au demarrage (> 1 h) n'est pas annonce a nouveau.
      if (now.getTime() - new Date(r.remind_at).getTime() > 3_600_000) continue;
      const s = r.snapshot;
      const text = `${s.authorName} : ${(s.content || 'Pièce jointe').slice(0, 80)}`;
      toast('Rappel', {
        description: text,
        duration: 12_000,
        action: {
          label: 'Voir',
          onClick: () => window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: r.source === 'dm' ? { serverId: null, conversationId: r.conversation_id } : { serverId: r.server_id, channelId: r.channel_id } })),
        },
      });
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('Rappel', { body: text });
      } catch { /* notifications indisponibles */ }
    }
  }, [data, now]);
}
