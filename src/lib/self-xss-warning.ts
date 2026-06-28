/**
 * Self-XSS warning displayed in the browser DevTools console.
 *
 * Mirrors Discord's real behavior (verified via comparative console export):
 * - The title + "scam" line + "pasting" line REPEAT on each channel switch.
 * - The closing "unless you understand..." line is printed only once per
 *   session, right after the very first repeating block at app boot.
 *
 * No i18n framework is present in this project, so the language is
 * detected directly from `navigator.language` with an English fallback.
 */

type Lang = 'fr' | 'en';

interface SelfXssStrings {
  title: string;
  warning: string;
  info1: string;
  info2: string;
}

const translations: Record<Lang, SelfXssStrings> = {
  fr: {
    title: 'Attends !',
    warning:
      'Coller quoi que ce soit ici pourrait donner accès à des attaquants à ton compte.',
    info1:
      "Si quelqu'un t'a dit de copier/coller quelque chose ici, il y a 11 chances sur 10 que tu sois en train de te faire arnaquer.",
    info2:
      'À moins de savoir exactement ce que tu fais, ferme cette fenêtre et reste prudent.',
  },
  en: {
    title: 'Hold Up!',
    warning:
      'Pasting anything here could give attackers access to your account.',
    info1:
      "If someone told you to copy/paste something here, you have an 11/10 chance you're being scammed.",
    info2:
      'Unless you understand exactly what you are doing, close this window and stay safe.',
  },
};

function getLang(): Lang {
  try {
    const raw = navigator.language?.slice(0, 2).toLowerCase();
    if (raw && raw in translations) return raw as Lang;
  } catch {
    /* noop */
  }
  return 'en';
}

function isDisabled(): boolean {
  if (typeof window === 'undefined') return true;
  if (import.meta.env.DEV) return true;
  return false;
}

/**
 * Repeating block: title + scam line + pasting warning.
 * Called on initial load AND on every active channel/route change.
 */
export function logSelfXssRepeating(): void {
  if (isDisabled()) return;
  const t = translations[getLang()];

  try {
    console.log(
      `%c${t.title}`,
      'color: #ff3838; font-size: 60px; font-weight: 900; text-shadow: 2px 2px 0 rgba(0,0,0,0.25);'
    );
    console.log(
      `%c${t.info1}`,
      'color: inherit; font-size: 16px;'
    );
    console.log(
      `%c${t.warning}`,
      'color: #ff3838; font-size: 22px; font-weight: 700;'
    );
  } catch {
    /* console may be unavailable in some embedded contexts */
  }
}

/**
 * Closing line ("unless you understand..."): printed at most once per
 * session, right after the very first repeating block at boot.
 */
export function logSelfXssClosing(): void {
  if (isDisabled()) return;

  const w = window as unknown as { __selfXssWarned?: boolean };
  if (w.__selfXssWarned) return;
  w.__selfXssWarned = true;

  const t = translations[getLang()];

  try {
    console.log(
      `%c${t.info2}`,
      'color: inherit; font-size: 16px;'
    );
  } catch {
    /* noop */
  }
}
