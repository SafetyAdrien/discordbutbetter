import type { SectionDefinition } from './SectionRegistryTypes';

export const desktopSettingsSections = [
  {
    id: 'install-app',
    tabType: 'desktop_settings',
    label: 'Installer sur cet appareil',
    description: "Installer NexusChat en tant qu'application autonome.",
    keywords: ['installer', 'install', 'pwa', 'application', 'desktop'],
    isAdvanced: false,
  },
  {
    id: 'launch-on-startup',
    tabType: 'desktop_settings',
    label: 'Lancer au démarrage',
    description: "Ouvrir NexusChat à l'ouverture de session.",
    keywords: ['démarrage', 'startup', 'boot', 'autolaunch'],
    isAdvanced: false,
  },
  {
    id: 'hardware-acceleration',
    tabType: 'desktop_settings',
    label: 'Accélération matérielle',
    description: 'Utiliser le GPU pour le rendu.',
    keywords: ['gpu', 'accélération', 'hardware', 'rendu', 'performance'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
