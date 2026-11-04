import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/*
 * Rattrapage des evenements temps reel perdus. Le Realtime ne rejoue pas ce qui s'est passe pendant une coupure
 * (veille, reseau, onglet en arriere-plan) : au retour on relit donc tout ce qui est affiche. Declencheurs :
 *  - le socket Realtime repasse de "coupe" a "connecte" ;
 *  - le reseau revient (`online`) ;
 *  - l'onglet / la fenetre redevient visible apres plus de 10 s ;
 *  - un trou dans l'horloge (ordinateur sorti de veille) : le minuteur de controle n'a pas tourne pendant > 20 s.
 * Seules les requetes affichees sont relues (`refetchType: 'active'`), au plus une fois toutes les 4 s.
 */

const MIN_GAP_MS = 4000;
const HIDDEN_MS = 10_000;
const SLEEP_MS = 20_000;
const TICK_MS = 2000;
// Donnees qui ne dependent pas d'autres utilisateurs : inutile de les relire.
const SKIP = new Set(['gif-search', 'gifs', 'url-metadata', 'link-preview']);

export function useRealtimeResync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let connected = supabase.realtime.isConnected();
    let lastSync = 0;
    let lastTick = Date.now();
    let hiddenAt: number | null = document.visibilityState === 'hidden' ? Date.now() : null;
    let onlineTimer: ReturnType<typeof setTimeout> | undefined;

    const resync = () => {
      const now = Date.now();
      if (now - lastSync < MIN_GAP_MS) return;
      lastSync = now;
      void queryClient.invalidateQueries({
        refetchType: 'active',
        predicate: (q) => !SKIP.has(String(q.queryKey[0])),
      });
    };

    const tick = window.setInterval(() => {
      const now = Date.now();
      const slept = now - lastTick > SLEEP_MS;
      lastTick = now;
      const nowConnected = supabase.realtime.isConnected();
      const reconnected = nowConnected && !connected;
      connected = nowConnected;
      if (reconnected || (slept && nowConnected)) resync();
    }, TICK_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > HIDDEN_MS) resync();
      hiddenAt = null;
    };
    // Le socket met un instant a se rouvrir : on laisse passer 1,5 s avant de relire.
    const onOnline = () => {
      clearTimeout(onlineTimer);
      onlineTimer = setTimeout(resync, 1500);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(tick);
      clearTimeout(onlineTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [queryClient, user]);
}
