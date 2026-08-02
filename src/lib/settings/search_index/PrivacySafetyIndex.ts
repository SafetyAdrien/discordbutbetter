import type { SearchableSettingDescriptor } from './SearchIndexTypes';

/**
 * Entrées de recherche additionnelles pour le tab "privacy_safety".
 */
export const privacySafetyIndex = [
  {
    id: 'privacy-birthday-visibility',
    tabType: 'privacy_safety',
    label: 'Qui peut voir mon anniversaire',
    keywords: ['anniversaire', 'birthday', 'visibilité', 'confidentialité', 'amis', 'privé'],
    description: 'Choisis entre moi uniquement, mes amis ou tout le monde.',
    tags: ['privacy'],
  },
  {
    id: 'privacy-badge-visibility',
    tabType: 'privacy_safety',
    label: 'Qui peut voir mes badges',
    keywords: ['badges', 'historique', 'visibilité', 'confidentialité', 'amis', 'privé'],
    description: 'Contrôle la visibilité de tes badges et de ton historique de badges.',
    tags: ['privacy'],
  },
] as const satisfies ReadonlyArray<SearchableSettingDescriptor>;

