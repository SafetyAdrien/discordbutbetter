import type { SettingsMetadata } from '../SettingsMetadata';

export type UserSettingsTabType =
  | 'my_profile'
  | 'account_security'
  | 'privacy_safety'
  | 'linked_accounts'
  | 'authorized_apps'
  | 'blocked_users'
  | 'devices'
  | 'appearance'
  | 'notifications'
  | 'chat_settings'
  | 'voice_video'
  | 'accessibility'
  | 'language'
  | 'keybinds'
  | 'desktop_settings'
  | 'advanced_settings';

export type SectionKeyword = string;

export interface SectionDefinition extends SettingsMetadata {
  id: string;
  tabType: UserSettingsTabType;
  label: string;
  description?: string;
  keywords: ReadonlyArray<SectionKeyword>;
  isAdvanced: boolean;
  isVisible?: () => boolean;
}

export interface SettingsSectionConfig {
  id: string;
  label: string;
  isAdvanced: boolean;
  audience?: SettingsMetadata['audience'];
  tags?: SettingsMetadata['tags'];
  addedAt?: string;
  badges?: SettingsMetadata['badges'];
}

export interface SearchableSettingItem extends SettingsMetadata {
  id: string;
  tabType: UserSettingsTabType;
  sourceTabType?: UserSettingsTabType;
  sectionId?: string;
  sourceSectionId?: string;
  label: string;
  keywords: Array<string>;
  description?: string;
}
