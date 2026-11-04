/*
 * Langues proposees dans Parametres utilisateur > Langue et heure, dans
 * l'ordre de Discord. `dict` : fichier de src/i18n/locales utilise pour
 * traduire l'interface (absent = traduction pas encore disponible).
 */
export interface AppLanguage {
  code: string;
  /** Nom dans la langue elle-meme ("Deutsch"). */
  native: string;
  /** Nom en francais, traduit avec le reste de l'interface. */
  label: string;
  flag: string;
  /** Balise BCP 47 pour Intl (dates, nombres). */
  intl: string;
  dict?: 'en';
}

export const LANGUAGES: AppLanguage[] = [
  { code: 'id', native: 'Bahasa Indonesia', label: 'Indonésien', flag: '🇮🇩', intl: 'id-ID' },
  { code: 'da', native: 'Dansk', label: 'Danois', flag: '🇩🇰', intl: 'da-DK' },
  { code: 'de', native: 'Deutsch', label: 'Allemand', flag: '🇩🇪', intl: 'de-DE' },
  { code: 'en-GB', native: 'English, UK', label: 'Anglais, Royaume-Uni', flag: '🇬🇧', intl: 'en-GB', dict: 'en' },
  { code: 'en-US', native: 'English, US', label: 'Anglais, États-Unis', flag: '🇺🇸', intl: 'en-US', dict: 'en' },
  { code: 'es-ES', native: 'Español', label: 'Espagnol', flag: '🇪🇸', intl: 'es-ES' },
  { code: 'es-419', native: 'Español, LATAM', label: 'Espagnol, Amérique latine', flag: '🇲🇽', intl: 'es-419' },
  { code: 'fr', native: 'Français', label: 'Français', flag: '🇫🇷', intl: 'fr-FR' },
  { code: 'hr', native: 'Hrvatski', label: 'Croate', flag: '🇭🇷', intl: 'hr-HR' },
  { code: 'it', native: 'Italiano', label: 'Italien', flag: '🇮🇹', intl: 'it-IT' },
  { code: 'lt', native: 'Lietuviškai', label: 'Lituanien', flag: '🇱🇹', intl: 'lt-LT' },
  { code: 'hu', native: 'Magyar', label: 'Hongrois', flag: '🇭🇺', intl: 'hu-HU' },
  { code: 'nl', native: 'Nederlands', label: 'Néerlandais', flag: '🇳🇱', intl: 'nl-NL' },
  { code: 'no', native: 'Norsk', label: 'Norvégien', flag: '🇳🇴', intl: 'nb-NO' },
  { code: 'pl', native: 'Polski', label: 'Polonais', flag: '🇵🇱', intl: 'pl-PL' },
  { code: 'pt-BR', native: 'Português do Brasil', label: 'Portugais, Brésil', flag: '🇧🇷', intl: 'pt-BR' },
  { code: 'ro', native: 'Română', label: 'Roumain', flag: '🇷🇴', intl: 'ro-RO' },
  { code: 'fi', native: 'Suomi', label: 'Finnois', flag: '🇫🇮', intl: 'fi-FI' },
  { code: 'sv-SE', native: 'Svenska', label: 'Suédois', flag: '🇸🇪', intl: 'sv-SE' },
  { code: 'vi', native: 'Tiếng Việt', label: 'Vietnamien', flag: '🇻🇳', intl: 'vi-VN' },
  { code: 'tr', native: 'Türkçe', label: 'Turc', flag: '🇹🇷', intl: 'tr-TR' },
  { code: 'cs', native: 'Čeština', label: 'Tchèque', flag: '🇨🇿', intl: 'cs-CZ' },
  { code: 'el', native: 'Ελληνικά', label: 'Grec', flag: '🇬🇷', intl: 'el-GR' },
  { code: 'bg', native: 'български', label: 'Bulgare', flag: '🇧🇬', intl: 'bg-BG' },
  { code: 'ru', native: 'Русский', label: 'Russe', flag: '🇷🇺', intl: 'ru-RU' },
  { code: 'uk', native: 'Українська', label: 'Ukrainien', flag: '🇺🇦', intl: 'uk-UA' },
  { code: 'hi', native: 'हिंदी', label: 'Hindi', flag: '🇮🇳', intl: 'hi-IN' },
  { code: 'th', native: 'ไทย', label: 'Thaï', flag: '🇹🇭', intl: 'th-TH' },
  { code: 'zh-CN', native: '中文', label: 'Chinois, Chine', flag: '🇨🇳', intl: 'zh-CN' },
  { code: 'zh-TW', native: '繁體中文', label: 'Chinois, Taïwan', flag: '🇹🇼', intl: 'zh-TW' },
  { code: 'ja', native: '日本語', label: 'Japonais', flag: '🇯🇵', intl: 'ja-JP' },
  { code: 'ko', native: '한국어', label: 'Coréen', flag: '🇰🇷', intl: 'ko-KR' },
];

export const DEFAULT_LANGUAGE = 'fr';

export const findLanguage = (code: string | null | undefined) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE)!;

/** La langue peut etre choisie : francais (source) ou dictionnaire present. */
export const isLanguageAvailable = (l: AppLanguage) => l.code === DEFAULT_LANGUAGE || !!l.dict;
