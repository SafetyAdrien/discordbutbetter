import { createContext, useContext } from 'react';

export interface AccountSettingsContextValue {
  close: () => void;
}

export const AccountSettingsContext = createContext<AccountSettingsContextValue | null>(null);

export function useAccountSettings(): AccountSettingsContextValue | null {
  return useContext(AccountSettingsContext);
}
