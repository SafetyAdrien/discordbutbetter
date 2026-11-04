import { createContext, useContext } from 'react';

/** Vrai tant que le menu contextuel du message est ouvert : la barre de survol reste affichee. */
export const MessageMenuOpenContext = createContext(false);
export const useMessageMenuOpen = () => useContext(MessageMenuOpenContext);
