import type { SettingsMetadata } from '../SettingsMetadata';
import type { UserSettingsTabType } from '../SettingsSectionRegistry';

export interface SearchableSettingDescriptor extends SettingsMetadata {
  id: string;
  tabType: UserSettingsTabType;
  sourceTabType?: UserSettingsTabType;
  sectionId?: string;
  sourceSectionId?: string;
  label: string;
  keywords: Array<string>;
  description?: string;
  isVisible?: () => boolean;
}
