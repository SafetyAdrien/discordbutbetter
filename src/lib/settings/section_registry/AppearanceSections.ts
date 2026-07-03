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
  {
    id: 'category-typography',
    tabType: 'appearance',
    label: 'Typographie des catégories',
    description: "Choisir la casse d'affichage des libellés de catégories (client uniquement, sync cross-device).",
    keywords: ['casse', 'majuscules', 'minuscules', 'uppercase', 'lowercase', 'capitalize', 'typographie', 'catégories', 'AG', 'ag', 'Ag', 'Aa'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;

