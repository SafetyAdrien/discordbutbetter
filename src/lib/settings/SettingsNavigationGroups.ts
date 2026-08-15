import type { UserSettingsTabType } from './section_registry/SectionRegistryTypes';

export const ACCOUNT_SETTINGS_TAB: UserSettingsTabType = 'account_security';

export const ACCOUNT_NESTED_TAB_TYPES = [
  'authorized_apps',
  'blocked_users',
  'devices',
] as const satisfies ReadonlyArray<UserSettingsTabType>;

export type AccountNestedSettingsTabType = (typeof ACCOUNT_NESTED_TAB_TYPES)[number];

export const PRIMARY_SETTINGS_NAV_HIDDEN_TAB_TYPES = new Set<UserSettingsTabType>([...ACCOUNT_NESTED_TAB_TYPES]);

export function isAccountNestedSettingsTab(
  tabType: UserSettingsTabType | null | undefined,
): tabType is AccountNestedSettingsTabType {
  return ACCOUNT_NESTED_TAB_TYPES.some((candidate) => candidate === tabType);
}
