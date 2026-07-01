import type { SectionDefinition } from './SectionRegistryTypes';

export const chatSettingsSections = [
  {
    id: 'compact-mode',
    tabType: 'chat_settings',
    label: 'Mode compact',
    description: 'Réduit les espacements entre les messages.',
    keywords: ['compact', 'dense', 'espacement', 'messages', 'affichage'],
    isAdvanced: false,
  },
  {
    id: 'link-previews',
    tabType: 'chat_settings',
    label: 'Aperçu des liens',
    description: 'Affiche un aperçu enrichi pour les URLs partagées.',
    keywords: ['lien', 'url', 'aperçu', 'preview', 'embed'],
    isAdvanced: false,
  },
  {
    id: 'animated-emojis',
    tabType: 'chat_settings',
    label: 'Emojis et GIFs animés',
    description: 'Autorise la lecture des animations dans les messages.',
    keywords: ['emoji', 'gif', 'animation', 'animé', 'sticker'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
