import type { SectionDefinition } from './SectionRegistryTypes';

export const notificationsSections = [
  {
    id: 'desktop-notifications',
    tabType: 'notifications',
    label: 'Notifications de bureau',
    description: 'Alertes système pour mentions et messages directs.',
    keywords: ['notifications', 'alertes', 'bureau', 'desktop', 'push', 'mentions'],
    isAdvanced: false,
  },
  {
    id: 'notification-sounds',
    tabType: 'notifications',
    label: 'Sons de notification',
    description: 'Sons joués lors des notifications.',
    keywords: ['son', 'sonnerie', 'audio', 'bruit', 'ping'],
    isAdvanced: false,
  },
  {
    id: 'email-notifications',
    tabType: 'notifications',
    label: 'Notifications par e-mail',
    description: 'Résumé e-mail des messages manqués.',
    keywords: ['email', 'e-mail', 'courriel', 'résumé', 'digest'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
