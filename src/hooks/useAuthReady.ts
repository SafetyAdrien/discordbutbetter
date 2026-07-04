import { useAuth } from '@/contexts/AuthContext';

/**
 * Source unique de vérité pour savoir si l'authentification est initialisée.
 *
 * À utiliser dans TOUT hook Supabase qui dépend de l'utilisateur :
 *   const { user, isReady } = useAuthReady();
 *   useQuery({ ..., enabled: isReady && !!user });
 *
 * Ne jamais lire `user`/`session` avant que `isReady === true` — sinon les
 * requêtes RLS peuvent partir avec `auth.uid() === null`.
 */
export function useAuthReady() {
  const { user, session, loading } = useAuth();
  return { user, session, isReady: !loading };
}
