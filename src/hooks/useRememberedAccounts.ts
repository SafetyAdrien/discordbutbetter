import { useState, useCallback } from 'react';

export interface RememberedAccount {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  lastLoginAt: number;
}

const STORAGE_KEY = 'remembered_accounts';
const MAX_ACCOUNTS = 5;

// Initialize from localStorage synchronously
function getInitialAccounts(): RememberedAccount[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as RememberedAccount[];
      return parsed.sort((a, b) => b.lastLoginAt - a.lastLoginAt);
    }
  } catch (e) {
    console.error('Error parsing remembered accounts:', e);
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

export function useRememberedAccounts() {
  const [accounts, setAccounts] = useState<RememberedAccount[]>(getInitialAccounts);

  const addRememberedAccount = useCallback((account: RememberedAccount) => {
    setAccounts(prev => {
      // Remove existing account with same id if it exists
      const filtered = prev.filter(a => a.id !== account.id);
      // Add new account at the beginning
      const updated = [account, ...filtered].slice(0, MAX_ACCOUNTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeRememberedAccount = useCallback((id: string) => {
    setAccounts(prev => {
      const updated = prev.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateAccountLastLogin = useCallback((id: string) => {
    setAccounts(prev => {
      const updated = prev.map(a => 
        a.id === id ? { ...a, lastLoginAt: Date.now() } : a
      ).sort((a, b) => b.lastLoginAt - a.lastLoginAt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    accounts,
    addRememberedAccount,
    removeRememberedAccount,
    updateAccountLastLogin,
  };
}
