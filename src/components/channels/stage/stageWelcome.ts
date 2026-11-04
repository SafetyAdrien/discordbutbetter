import { userKey } from '@/lib/userScope';
/** Fenetre "Bienvenue dans les conferences !" : affichee une seule fois par navigateur. */
const WELCOME_KEY = "stage:welcome-seen";

export function hasSeenStageWelcome(): boolean {
  try {
    return localStorage.getItem(userKey(WELCOME_KEY)) === "1";
  } catch {
    return true;
  }
}

export function markStageWelcomeSeen() {
  try {
    localStorage.setItem(userKey(WELCOME_KEY), "1");
  } catch {
    /* stockage indisponible */
  }
}
