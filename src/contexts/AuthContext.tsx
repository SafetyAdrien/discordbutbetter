/**
 * ============================================================================
 * CRITICAL — AUTH CONTRACT — DO NOT MODIFY WITHOUT READING mem://architecture/auth-contract
 * ============================================================================
 * Règles inviolables (toute violation casse le login) :
 *   1. JAMAIS d'`await` dans `onAuthStateChange` (fire-and-forget uniquement).
 *   2. `onAuthStateChange` est enregistré AVANT `getSession()`.
 *   3. `setLoading(false)` doit TOUJOURS être atteint (safety net 4s conservé).
 *   4. Aucun composant ne doit lire `user/session` avant `loading === false` —
 *      utiliser `useAuthReady()` ou `<RequireAuth>`.
 *   5. Toute mutation du profil passe par `updateProfile` / `updateStatus`.
 * ============================================================================
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { cacheGetSync, cacheSetAsync, cacheDelete, purgeAllCaches } from '@/lib/cache';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ data: any; error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  updateStatus: (status: Database['public']['Enums']['user_status']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const manualStatus = data.manual_status as Database['public']['Enums']['user_status'] | null;
      const restoredStatus = manualStatus ?? (data.status === 'dnd' ? 'dnd' : 'online');
      const shouldRestoreStatus = data.status !== restoredStatus;
      const nextProfile = (shouldRestoreStatus ? { ...data, status: restoredStatus } : data) as Profile;
      setProfile(nextProfile);
      cacheSetAsync(`profile:${userId}`, nextProfile);

      if (shouldRestoreStatus) {
        await supabase.from('profiles').update({ status: restoredStatus }).eq('id', userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);

    const nextUser = nextSession?.user ?? null;
    // Keep the same object reference when the user id hasn't changed (e.g. a
    // TOKEN_REFRESHED event right after SIGNED_IN) so effects keyed on `user`
    // don't re-run and re-subscribe to already-subscribed realtime channels.
    setUser((prev) => (prev && nextUser && prev.id === nextUser.id ? prev : nextUser));

    if (!nextUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const cachedProfile = cacheGetSync<Profile>(`profile:${nextUser.id}`);
    if (cachedProfile) {
      setProfile(cachedProfile);
    }

    setLoading(false);
    void fetchProfile(nextUser.id);
  }, [fetchProfile]);

  useEffect(() => {
    let resolved = false;
    const resolve = (nextSession: Session | null) => {
      if (resolved) {
        // Update session on subsequent auth changes (SIGNED_IN/OUT/TOKEN_REFRESHED)
        applySession(nextSession);
        return;
      }
      resolved = true;
      applySession(nextSession);
    };

    // 1. Enregistrer onAuthStateChange EN PREMIER (règle #2 du contrat).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      resolve(nextSession);
    });

    // 2. Puis restaurer la session existante depuis le storage.
    // Résilience : si getSession renvoie null MAIS qu'un token Supabase est
    // présent en localStorage (cas mobile Safari/PWA), on attend l'événement
    // INITIAL_SESSION jusqu'au safety net plutôt que de basculer en logout.
    const hasStoredToken = (() => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
        }
      } catch { /* storage inaccessible */ }
      return false;
    })();

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession || !hasStoredToken) {
        resolve(existingSession);
      }
      // sinon : on laisse onAuthStateChange/safety net décider
    }).catch(() => {
      if (!resolved && !hasStoredToken) resolve(null);
    });

    // Safety net: never let the loading screen hang forever (mobile Safari /
    // PWA can wedge supabase.auth.getSession()). After 4s, force-exit loading.
    const safety = setTimeout(() => {
      if (!resolved) {
        console.warn('[auth] getSession timed out — falling back to no session');
        resolve(null);
      }
    }, 4000);

    return () => {
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile:${user.id}-${instanceIdRef.current}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const nextProfile = payload.new as Profile;
          setProfile(nextProfile);
          cacheSetAsync(`profile:${user.id}`, nextProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username.toLowerCase(),
          display_name: displayName,
        },
      },
    });
    return { data, error };
  };

  const signOut = useCallback(async () => {
    if (user) {
      cacheDelete(`profile:${user.id}`);
    }

    // Les clés de cache messages/dm-messages/threads/channels ne sont PAS
    // scopées par utilisateur (cf. HOT_PREFIXES dans lib/cache). Sans purge,
    // le prochain utilisateur qui se connecte sur ce navigateur verrait
    // l'historique privé de l'utilisateur précédent via placeholderData.
    try {
      await purgeAllCaches();
    } catch {
      // la purge est best-effort : ne jamais bloquer la déconnexion
    }
    // react-query détient les mêmes données en mémoire : sans reset, le cache
    // en mémoire survit à la purge disque et ré-alimente placeholderData.
    try {
      queryClient.clear();
    } catch {
      // best-effort
    }

    await supabase.auth.signOut();
    setProfile(null);
  }, [user, queryClient]);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);

    if (error) throw error;

    setProfile(prev => {
      const next = prev ? { ...prev, ...data } : null;
      if (next) cacheSetAsync(`profile:${user.id}`, next);
      return next;
    });
  }, [user]);

  const updateStatus = useCallback(async (status: Database['public']['Enums']['user_status']) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ status, manual_status: status })
      .eq('id', user.id);

    if (error) throw error;

    setProfile(prev => {
      const next = prev ? { ...prev, status, manual_status: status } : null;
      if (next) cacheSetAsync(`profile:${user.id}`, next);
      return next;
    });
  }, [user]);

  // Memoized: an inline literal here would invalidate the context for all 151
  // consumers on every auth state change, re-rendering the entire app.
  const contextValue = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updateStatus,
    }),
    [user, session, profile, loading, signIn, signUp, signOut, updateProfile, updateStatus],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
