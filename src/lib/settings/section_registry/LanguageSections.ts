import type { SectionDefinition } from './SectionRegistryTypes';

export const languageSections = [
  {
    id: 'interface-language',
    tabType: 'language',
    label: "Langue de l'interface",
    description: "Langue d'affichage de l'application.",
    keywords: ['langue', 'language', 'locale', 'français', 'english', 'traduction', 'i18n'],
    isAdvanced: false,
  },
  {
    id: 'time-format',
    tabType: 'language',
    label: "Format d'heure",
    description: 'Choix entre 12 h et 24 h.',
    keywords: ['heure', 'time', '12h', '24h', 'format'],
    isAdvanced: false,
  },
  {
    id: 'date-format',
    tabType: 'language',
    label: 'Format de date',
    description: 'Format régional des dates.',
    keywords: ['date', 'format', 'régional', 'calendrier'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
