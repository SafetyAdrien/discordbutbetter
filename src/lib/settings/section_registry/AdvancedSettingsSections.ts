import type { SectionDefinition } from './SectionRegistryTypes';

export const advancedSettingsSections = [
  {
    id: 'developer-mode',
    tabType: 'advanced_settings',
    label: 'Mode développeur',
    description: 'Active les logs détaillés et les outils internes.',
    keywords: ['développeur', 'developer', 'debug', 'logs', 'dev mode'],
    isAdvanced: true,
  },
  {
    id: 'clear-cache',
    tabType: 'advanced_settings',
    label: 'Vider le cache local',
    description: 'Réinitialise les données mises en cache dans ce navigateur.',
    keywords: ['cache', 'vider', 'clear', 'reset', 'indexeddb', 'stockage'],
    isAdvanced: true,
  },
  {
    id: 'experimental-features',
    tabType: 'advanced_settings',
    label: 'Fonctionnalités expérimentales',
    description: 'Tester en avant-première les nouveautés en cours de développement.',
    keywords: ['expérimental', 'experimental', 'beta', 'nouveau', 'preview'],
    isAdvanced: true,
    badges: ['experimental'],
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
