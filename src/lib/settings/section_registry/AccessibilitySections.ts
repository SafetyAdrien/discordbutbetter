import type { SectionDefinition } from './SectionRegistryTypes';

export const accessibilitySections = [
  {
    id: 'text-size',
    tabType: 'accessibility',
    label: 'Taille du texte',
    description: 'Ajuste la taille de police globale.',
    keywords: ['texte', 'police', 'font', 'taille', 'zoom', 'lisibilité'],
    isAdvanced: false,
  },
  {
    id: 'high-contrast',
    tabType: 'accessibility',
    label: 'Contraste élevé',
    description: 'Renforce le contraste des couleurs.',
    keywords: ['contraste', 'contrast', 'visibilité', 'accessibilité'],
    isAdvanced: false,
  },
  {
    id: 'reduce-motion',
    tabType: 'accessibility',
    label: 'Réduire les animations',
    description: 'Désactive les transitions non essentielles.',
    keywords: ['animations', 'motion', 'transitions', 'mouvement', 'réduire'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
