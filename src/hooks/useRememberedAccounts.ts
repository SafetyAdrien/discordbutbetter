import { useState, useEffect, useCallback } from 'react';

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

export function useRememberedAccounts() {
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);

  // Load accounts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RememberedAccount[];
        // Sort by last login (most recent first)
        const sorted = parsed.sort((a, b) => b.lastLoginAt - a.lastLoginAt);
        setAccounts(sorted);
      } catch (e) {
        console.error('Error parsing remembered accounts:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

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
