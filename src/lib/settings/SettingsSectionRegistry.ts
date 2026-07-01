import { getSettingsAudience } from './SettingsMetadata';
import { accessibilitySections } from './section_registry/AccessibilitySections';
import { accountSecuritySections } from './section_registry/AccountSecuritySections';
import { advancedSettingsSections } from './section_registry/AdvancedSettingsSections';
import { appearanceSections } from './section_registry/AppearanceSections';
import { authorizedAppsSections } from './section_registry/AuthorizedAppsSections';
import { blockedUsersSections } from './section_registry/BlockedUsersSections';
import { chatSettingsSections } from './section_registry/ChatSettingsSections';
import { desktopSettingsSections } from './section_registry/DesktopSettingsSections';
import { devicesSections } from './section_registry/DevicesSections';
import { keybindsSections } from './section_registry/KeybindsSections';
import { languageSections } from './section_registry/LanguageSections';
import { linkedAccountsSections } from './section_registry/LinkedAccountsSections';
import { myProfileSections } from './section_registry/MyProfileSections';
import { notificationsSections } from './section_registry/NotificationsSections';
import { privacySafetySections } from './section_registry/PrivacySafetySections';
import type {
  SearchableSettingItem,
  SectionDefinition,
  SettingsSectionConfig,
  UserSettingsTabType,
} from './section_registry/SectionRegistryTypes';
import { voiceVideoSections } from './section_registry/VoiceVideoSections';

export type {
  SearchableSettingItem,
  SectionDefinition,
  SettingsSectionConfig,
  UserSettingsTabType,
} from './section_registry/SectionRegistryTypes';

const SECTION_REGISTRY: ReadonlyArray<SectionDefinition> = [
  ...myProfileSections,
  ...accountSecuritySections,
  ...privacySafetySections,
  ...linkedAccountsSections,
  ...authorizedAppsSections,
  ...blockedUsersSections,
  ...devicesSections,
  ...appearanceSections,
  ...notificationsSections,
  ...chatSettingsSections,
  ...voiceVideoSections,
  ...accessibilitySections,
  ...languageSections,
  ...keybindsSections,
  ...desktopSettingsSections,
  ...advancedSettingsSections,
];

export type SettingsSectionId = SectionDefinition['id'];
export type SettingsSectionDefinition = SectionDefinition;

function isSectionVisible(section: SectionDefinition): boolean {
  return !section.isVisible || section.isVisible();
}

function sectionMatchesTab(section: SectionDefinition, tabType: UserSettingsTabType): boolean {
  return section.tabType === tabType;
}

function sectionMatchesAllowedTabs(
  section: SectionDefinition,
  allowedTabTypes: Set<UserSettingsTabType> | undefined,
): boolean {
  return !allowedTabTypes || allowedTabTypes.has(section.tabType);
}

function toSettingsSectionConfig(section: SectionDefinition): SettingsSectionConfig {
  return {
    id: section.id,
    label: section.label,
    isAdvanced: section.isAdvanced,
    audience: getSettingsAudience(section),
    tags: section.tags,
    addedAt: section.addedAt,
    badges: section.badges,
  };
}

function toSearchableSettingItem(section: SectionDefinition): SearchableSettingItem {
  return {
    id: `section-${section.tabType}-${section.id}`,
    tabType: section.tabType,
    sourceTabType: section.tabType,
    sectionId: section.id,
    sourceSectionId: section.id,
    label: section.label,
    keywords: [...section.keywords],
    description: section.description,
    audience: getSettingsAudience(section),
    tags: section.tags,
    addedAt: section.addedAt,
    badges: section.badges,
  };
}

export function getSectionsForTab(tabType: UserSettingsTabType): Array<SettingsSectionConfig> {
  return getVisibleSectionsForTab(tabType).map(toSettingsSectionConfig);
}

export function getSectionIdsForTab(tabType: UserSettingsTabType): Array<string> {
  return getVisibleSectionsForTab(tabType).map((section) => section.id);
}

export function tabHasSections(tabType: UserSettingsTabType): boolean {
  return SECTION_REGISTRY.some((section) => section.tabType === tabType);
}

export function tabHasMultipleLinkableSections(tabType: UserSettingsTabType): boolean {
  return getVisibleSectionsForTab(tabType).length > 1;
}

export function getAllSectionDefinitions(): Array<SettingsSectionDefinition> {
  return Array.from(SECTION_REGISTRY);
}

export function getSectionDefinition(
  sectionId: string,
  tabType?: UserSettingsTabType,
): SettingsSectionDefinition | undefined {
  return SECTION_REGISTRY.find((section) => section.id === sectionId && (!tabType || section.tabType === tabType));
}

export function getVisibleSectionsForTab(tabType: UserSettingsTabType): Array<SettingsSectionDefinition> {
  return SECTION_REGISTRY.filter((section) => sectionMatchesTab(section, tabType) && isSectionVisible(section));
}

export function isSectionIdValid(sectionId: string, tabType?: UserSettingsTabType): boolean {
  return SECTION_REGISTRY.some((section) => {
    if (section.id !== sectionId) return false;
    if (tabType && section.tabType !== tabType) return false;
    return true;
  });
}

export function getSearchableItemsFromRegistry(
  allowedTabTypes?: Set<UserSettingsTabType>,
): Array<SearchableSettingItem> {
  return SECTION_REGISTRY.filter(
    (section) => sectionMatchesAllowedTabs(section, allowedTabTypes) && isSectionVisible(section),
  ).map(toSearchableSettingItem);
}
