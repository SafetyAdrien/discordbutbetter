import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { cacheGetSync, cacheSetAsync, cacheDelete } from '@/lib/cache';

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

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const shouldGoOnline = data.status !== 'dnd';
      const nextProfile = (shouldGoOnline ? { ...data, status: 'online' } : data) as Profile;
      setProfile(nextProfile);
      cacheSetAsync(`profile:${userId}`, nextProfile);

      if (shouldGoOnline) {
        await supabase.from('profiles').update({ status: 'online' }).eq('id', userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);

    const nextUser = nextSession?.user ?? null;
    setUser(nextUser);

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      applySession(existingSession);
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile:${user.id}`, { config: { private: true } })
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

  const signOut = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ status: 'offline' })
        .eq('id', user.id);

      cacheDelete(`profile:${user.id}`);
    }

    await supabase.auth.signOut();
    setProfile(null);
  };

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
      .update({ status })
      .eq('id', user.id);

    if (error) throw error;

    setProfile(prev => {
      const next = prev ? { ...prev, status } : null;
      if (next) cacheSetAsync(`profile:${user.id}`, next);
      return next;
    });
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        updateStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
