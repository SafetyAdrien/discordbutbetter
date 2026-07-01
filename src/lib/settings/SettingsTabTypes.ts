import {
  Accessibility,
  AppWindow,
  Ban,
  Bell,
  Keyboard,
  Languages,
  Link2,
  MessageSquare,
  Mic,
  Monitor,
  Palette,
  Shield,
  Sliders,
  Smartphone,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserSettingsTabType } from './section_registry/SectionRegistryTypes';

export type { UserSettingsTabType } from './section_registry/SectionRegistryTypes';

export type SettingsTabCategory = 'user_settings' | 'app_settings';

export const SETTINGS_CATEGORY_LABELS: Record<SettingsTabCategory, string> = {
  user_settings: 'Mon compte',
  app_settings: "Paramètres de l'application",
};

export interface SettingsTabDescriptor {
  type: UserSettingsTabType;
  category: SettingsTabCategory;
  label: string;
  icon: LucideIcon;
  implementedBy: string | null;
}

export const ALL_TAB_DESCRIPTORS: ReadonlyArray<SettingsTabDescriptor> = [
  { type: 'my_profile', category: 'user_settings', label: 'Profil', icon: User, implementedBy: 'ProfileSettingsTab' },
  { type: 'account_security', category: 'user_settings', label: 'Mon compte', icon: Shield, implementedBy: 'AccountSettings' },
  { type: 'privacy_safety', category: 'user_settings', label: 'Confidentialité', icon: Shield, implementedBy: 'PrivacySettings' },
  { type: 'linked_accounts', category: 'user_settings', label: 'Connexions', icon: Link2, implementedBy: 'ConnectionsSettings' },
  { type: 'authorized_apps', category: 'user_settings', label: 'Applications autorisées', icon: AppWindow, implementedBy: 'AuthorizedAppsSettings' },
  { type: 'blocked_users', category: 'user_settings', label: 'Utilisateurs bloqués', icon: Ban, implementedBy: null },
  { type: 'devices', category: 'user_settings', label: 'Sessions actives', icon: Smartphone, implementedBy: 'SessionsSettings' },
  { type: 'appearance', category: 'app_settings', label: 'Apparence', icon: Palette, implementedBy: 'AppearanceSettings' },
  { type: 'notifications', category: 'app_settings', label: 'Notifications', icon: Bell, implementedBy: 'NotificationsSettings' },
  { type: 'chat_settings', category: 'app_settings', label: 'Chat', icon: MessageSquare, implementedBy: 'ChatSettings' },
  { type: 'voice_video', category: 'app_settings', label: 'Voix & vidéo', icon: Mic, implementedBy: 'VoiceVideoSettings' },
  { type: 'accessibility', category: 'app_settings', label: 'Accessibilité', icon: Accessibility, implementedBy: 'AccessibilitySettings' },
  { type: 'language', category: 'app_settings', label: 'Langue', icon: Languages, implementedBy: 'LanguageSettings' },
  { type: 'keybinds', category: 'app_settings', label: 'Raccourcis clavier', icon: Keyboard, implementedBy: 'KeybindsSettings' },
  { type: 'desktop_settings', category: 'app_settings', label: 'Application desktop', icon: Monitor, implementedBy: 'DesktopSettings' },
  { type: 'advanced_settings', category: 'app_settings', label: 'Avancé', icon: Sliders, implementedBy: 'AdvancedSettings' },
  { type: 'desktop_settings', category: 'app_settings', label: 'Application desktop', icon: Monitor, implementedBy: null },
  { type: 'advanced_settings', category: 'app_settings', label: 'Avancé', icon: Sliders, implementedBy: null },
] as const;

export const IMPLEMENTED_TAB_DESCRIPTORS: ReadonlyArray<SettingsTabDescriptor> = ALL_TAB_DESCRIPTORS.filter(
  (tab) => tab.implementedBy !== null,
);

export function getTabsByCategory(
  tabs: ReadonlyArray<SettingsTabDescriptor> = IMPLEMENTED_TAB_DESCRIPTORS,
): Array<[SettingsTabCategory, Array<SettingsTabDescriptor>]> {
  const order: Array<SettingsTabCategory> = ['user_settings', 'app_settings'];
  return order
    .map((category): [SettingsTabCategory, Array<SettingsTabDescriptor>] => [
      category,
      tabs.filter((tab) => tab.category === category),
    ])
    .filter(([, tabsInCategory]) => tabsInCategory.length > 0);
}
