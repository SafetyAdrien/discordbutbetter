import { getSettingsAudience, type SettingsCategoryTag, type SettingsStatusBadgeKind } from './SettingsMetadata';
import {
  getSearchableItemsFromRegistry,
  getSectionDefinition,
  type SearchableSettingItem,
  type UserSettingsTabType,
} from './SettingsSectionRegistry';
import { accessibilityIndex } from './search_index/AccessibilityIndex';
import { accountSecurityIndex } from './search_index/AccountSecurityIndex';
import { advancedSettingsIndex } from './search_index/AdvancedSettingsIndex';
import { appearanceIndex } from './search_index/AppearanceIndex';
import { authorizedAppsIndex } from './search_index/AuthorizedAppsIndex';
import { blockedUsersIndex } from './search_index/BlockedUsersIndex';
import { chatSettingsIndex } from './search_index/ChatSettingsIndex';
import { desktopSettingsIndex } from './search_index/DesktopSettingsIndex';
import { devicesIndex } from './search_index/DevicesIndex';
import { keybindsIndex } from './search_index/KeybindsIndex';
import { languageIndex } from './search_index/LanguageIndex';
import { linkedAccountsIndex } from './search_index/LinkedAccountsIndex';
import { myProfileIndex } from './search_index/MyProfileIndex';
import { notificationsIndex } from './search_index/NotificationsIndex';
import { privacySafetyIndex } from './search_index/PrivacySafetyIndex';
import type { SearchableSettingDescriptor } from './search_index/SearchIndexTypes';
import { voiceVideoIndex } from './search_index/VoiceVideoIndex';

export interface SettingsTab {
  type: UserSettingsTabType;
  label: string;
}

export interface SettingsSearchResult {
  tab: SettingsTab;
  matchedItems: Array<SearchableSettingItem>;
  score: number;
}

function isSearchableDescriptorVisible(item: SearchableSettingDescriptor): boolean {
  return !item.isVisible || item.isVisible();
}

function toSearchableSettingItem(item: SearchableSettingDescriptor): SearchableSettingItem {
  const { id, tabType, sourceTabType, sectionId, sourceSectionId, label, keywords, description, tags, addedAt, badges } =
    item;
  const resolvedSourceTabType = sourceTabType ?? tabType;
  const section = sectionId ? getSectionDefinition(sectionId, resolvedSourceTabType) : undefined;
  return {
    id,
    tabType,
    sourceTabType: resolvedSourceTabType,
    sectionId,
    sourceSectionId: sourceSectionId ?? sectionId,
    label,
    keywords: [...keywords],
    description,
    audience: getSettingsAudience({ id, audience: item.audience, isAdvanced: section?.isAdvanced }),
    tags,
    addedAt,
    badges,
  };
}

const ADDITIONAL_SEARCHABLE_ITEMS: Array<SearchableSettingDescriptor> = [
  ...myProfileIndex,
  ...accountSecurityIndex,
  ...privacySafetyIndex,
  ...linkedAccountsIndex,
  ...authorizedAppsIndex,
  ...blockedUsersIndex,
  ...devicesIndex,
  ...appearanceIndex,
  ...notificationsIndex,
  ...chatSettingsIndex,
  ...voiceVideoIndex,
  ...accessibilityIndex,
  ...languageIndex,
  ...keybindsIndex,
  ...desktopSettingsIndex,
  ...advancedSettingsIndex,
];

function createSearchableItems(): Array<SearchableSettingItem> {
  const registryItems = getSearchableItemsFromRegistry();
  const additionalItems = ADDITIONAL_SEARCHABLE_ITEMS.filter(isSearchableDescriptorVisible).map(
    toSearchableSettingItem,
  );
  return [...registryItems, ...additionalItems];
}

let cachedSearchableItems: Array<SearchableSettingItem> | null = null;

export function getSearchableItems(): Array<SearchableSettingItem> {
  if (!cachedSearchableItems) {
    cachedSearchableItems = createSearchableItems();
  }
  return cachedSearchableItems;
}

export function invalidateSearchCache(): void {
  cachedSearchableItems = null;
}

function normalizeSearchQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getQueryWords(normalizedQuery: string): Array<string> {
  return normalizedQuery.split(' ').filter((word) => word.length > 0);
}

function calculateTextMatchScore(
  text: string,
  word: string,
  exactScore: number,
  prefixScore: number,
  containsScore: number,
): number {
  if (!text.includes(word)) return 0;
  if (text === word) return exactScore;
  return text.startsWith(word) ? prefixScore : containsScore;
}

function calculateKeywordMatchScore(keywords: Array<string>, word: string): number {
  return keywords.reduce((score, keyword) => score + calculateTextMatchScore(keyword, word, 80, 40, 20), 0);
}

function calculateMatchScore(item: SearchableSettingItem, queryWords: Array<string>): number {
  let score = 0;
  const labelLower = item.label.toLowerCase();
  const descriptionLower = item.description?.toLowerCase() ?? '';
  const keywordsLower = [...item.keywords, ...(item.tags ?? [])].map((k) => k.toLowerCase());
  for (const word of queryWords) {
    score += calculateTextMatchScore(labelLower, word, 100, 50, 25);
    score += calculateKeywordMatchScore(keywordsLower, word);
    if (descriptionLower.includes(word)) score += 10;
  }
  return score;
}

function createTabsByType(tabs: Array<SettingsTab>): Map<UserSettingsTabType, SettingsTab> {
  const tabsByType = new Map<UserSettingsTabType, SettingsTab>();
  for (const tab of tabs) {
    if (!tabsByType.has(tab.type)) tabsByType.set(tab.type, tab);
  }
  return tabsByType;
}

function addMatchedItemToResults(
  resultsByTab: Map<UserSettingsTabType, SettingsSearchResult>,
  tab: SettingsTab,
  item: SearchableSettingItem,
  score: number,
): void {
  const existing = resultsByTab.get(item.tabType);
  if (existing) {
    existing.matchedItems.push(item);
    existing.score = Math.max(existing.score, score);
    return;
  }
  resultsByTab.set(item.tabType, { tab, matchedItems: [item], score });
}

export function searchSettings(query: string, tabs: Array<SettingsTab>): Array<SettingsSearchResult> {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return [];
  const queryWords = getQueryWords(normalizedQuery);
  const items = getSearchableItems();
  const tabsByType = createTabsByType(tabs);
  const resultsByTab = new Map<UserSettingsTabType, SettingsSearchResult>();
  for (const item of items) {
    const tab = tabsByType.get(item.tabType);
    if (!tab) continue;
    const score = calculateMatchScore(item, queryWords);
    if (score > 0) addMatchedItemToResults(resultsByTab, tab, item, score);
  }
  const results = Array.from(resultsByTab.values());
  results.sort((a, b) => b.score - a.score);
  return results;
}

export function getAdvancedSettingItems(): Array<SearchableSettingItem> {
  return getSearchableItems().filter((item) => item.audience === 'advanced');
}

export function filterAdvancedSettingItems(
  query: string,
  tags: ReadonlySet<SettingsCategoryTag>,
  items: Array<SearchableSettingItem> = getAdvancedSettingItems(),
): Array<SearchableSettingItem> {
  const normalizedQuery = normalizeSearchQuery(query);
  const queryWords = getQueryWords(normalizedQuery);
  return items
    .filter((item) => tags.size === 0 || item.tags?.some((tag) => tags.has(tag)) === true)
    .map((item) => ({ item, score: queryWords.length === 0 ? 1 : calculateMatchScore(item, queryWords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .map(({ item }) => item);
}

export function getSearchableItemStatusBadges(item: SearchableSettingItem): ReadonlyArray<SettingsStatusBadgeKind> {
  return item.badges ?? [];
}

export function getMatchedSectionIds(results: Array<SettingsSearchResult>): Set<string> {
  const sectionIds = new Set<string>();
  for (const result of results) {
    for (const item of result.matchedItems) {
      if (item.sectionId) sectionIds.add(item.sectionId);
    }
  }
  return sectionIds;
}

export function getMatchedTabTypes(results: Array<SettingsSearchResult>): Set<UserSettingsTabType> {
  return new Set(results.map((r) => r.tab.type));
}
