import type { SectionDefinition } from './SectionRegistryTypes';

export const keybindsSections = [
  {
    id: 'reference',
    tabType: 'keybinds',
    label: 'Raccourcis clavier',
    description: 'Consulter la liste des raccourcis disponibles.',
    keywords: ['raccourcis', 'clavier', 'shortcuts', 'touches', 'ctrl', 'cmd'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
