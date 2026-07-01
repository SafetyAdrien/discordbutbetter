import type { SectionDefinition } from './SectionRegistryTypes';

export const appearanceSections = [
  {
    id: 'theme',
    tabType: 'appearance',
    label: 'Thème',
    description: "Choisir entre le thème sombre et le thème clair (à venir).",
    keywords: ['thème', 'sombre', 'clair', 'dark mode', 'light mode', 'couleurs', 'apparence'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
