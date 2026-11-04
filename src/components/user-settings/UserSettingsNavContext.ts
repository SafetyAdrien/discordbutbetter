import { createContext, useContext } from 'react';
import type { UserSettingsPage } from './userSettingsNav';

/** Navigation interne des Parametres (liens "Parametres connexes"). */
export const UserSettingsNavContext = createContext<{
  goTo: (page: UserSettingsPage, section?: string) => void;
  close: () => void;
}>({ goTo: () => undefined, close: () => undefined });

export const useUserSettingsNav = () => useContext(UserSettingsNavContext);
