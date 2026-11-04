/** Ouvre les parametres utilisateur sur une page donnee ("profile", "account"...) depuis n'importe quel composant. */
export const OPEN_USER_SETTINGS_EVENT = 'app:open-user-settings';

export function openUserSettings(tab: string) {
  window.dispatchEvent(new CustomEvent(OPEN_USER_SETTINGS_EVENT, { detail: { tab } }));
}
