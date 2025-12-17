import React, { createContext, useContext } from 'react';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type UserStatus = Database['public']['Enums']['user_status'];

interface PresenceContextType {
  setManualStatus: (status: UserStatus) => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setManualStatus } = usePresence();

  // Si pas d'utilisateur, fournir une fonction no-op
  const contextValue: PresenceContextType = {
    setManualStatus: user ? setManualStatus : () => {},
  };

  return (
    <PresenceContext.Provider value={contextValue}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
}
