/*
 * Balise Intl de la langue active ("fr-FR", "en-US"...), lue par les
 * formateurs de dates et d'heures. Module sans dependance pour pouvoir etre
 * importe partout (dateUtils, userSettings) sans cycle.
 */
let intlLocale = 'fr-FR';
let version = 0;

export const appLocale = () => intlLocale;
/** Change a chaque changement de langue : invalide les formateurs en cache. */
export const appLocaleVersion = () => version;

export function setAppLocale(tag: string) {
  if (tag === intlLocale) return;
  intlLocale = tag;
  version++;
}
