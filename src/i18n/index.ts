import { getUserSettings, subscribeUserSettings } from '@/lib/userSettings';
import { applyDictionary } from './translator';
import { setAppLocale } from './locale';
import { DEFAULT_LANGUAGE, findLanguage } from './languages';

/*
 * Langue de l'interface : suit Parametres utilisateur > Langue et heure
 * (language.locale) et s'applique immediatement, sans rechargement.
 */

const loaders: Record<string, () => Promise<Record<string, string>>> = {
  en: () => import('./locales/en.json').then((m) => m.default as Record<string, string>),
};

let applied: string | null = null;
let request = 0;

async function apply(code: string) {
  const lang = findLanguage(code);
  if (lang.code === applied) return;
  applied = lang.code;
  const id = ++request;
  setAppLocale(lang.intl);
  document.documentElement.lang = lang.code;
  if (lang.code === DEFAULT_LANGUAGE || !lang.dict) {
    applyDictionary(null);
  } else {
    const dict = await loaders[lang.dict]();
    if (id === request) applyDictionary(dict);
  }
  window.dispatchEvent(new CustomEvent('app-language-change', { detail: lang.code }));
}

export function initI18n() {
  if (typeof window === 'undefined') return;
  void apply(getUserSettings().language.locale);
  subscribeUserSettings(() => void apply(getUserSettings().language.locale));
}
