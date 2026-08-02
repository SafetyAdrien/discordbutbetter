# Birthday & badge visibility controls

Today there are only two states for the birthday (`birthday_public` on/off) and badge grant history has no user-facing setting at all (visibility is hard-coded to self / friends / shared server / shared DM). This adds real choice for both.

## What you'll get

In **Settings > Confidentialité**:

- **Anniversaire — Qui peut voir mon anniversaire**: a selector with three options
  - Moi uniquement (par défaut)
  - Mes amis
  - Tout le monde (membres de mes serveurs et DM)
  The existing toggle "Célébrer publiquement mon anniversaire" is replaced by this selector; "Moi uniquement" behaves exactly like the current off state (no crown, no badge, no ribbon for others).

- **Badges — Qui peut voir mes badges et mon historique**: same three-option selector
  - Moi uniquement
  - Mes amis
  - Tout le monde (défaut, matches current behaviour)
  This controls both the badge list on your profile and the per-year birthday badge history.

Both selectors save immediately, no save button, matching the current privacy page behaviour.

## Behaviour rules

- Whatever the setting, you always see your own birthday and badges.
- "Mes amis" = accepted friendships only.
- "Tout le monde" stays scoped to people who can already see you (shared server, DM, or friend) — it never exposes data to strangers.
- The birth **year** is still never shared, only day/month, as today.
- Changing the setting takes effect immediately for other users (existing realtime/badge caches are invalidated).

## Technical notes

Database migration:
- New enum `visibility_level` (`private`, `friends`, `everyone`).
- `user_birthdays`: add `birthday_visibility visibility_level not null default 'private'`, backfilled from `birthday_public` (`true` -> `everyone`). Keep `birthday_public` in sync via the same write path for now so nothing breaks, then read only the new column.
- `profiles` or a small `user_privacy_settings` row: add `badge_visibility visibility_level not null default 'everyone'`. Chosen location: extend `user_birthdays` is wrong semantically, so add the column to `profiles` (already owner-writable, RLS in place).
- Update the security-definer functions `is_birthday_today`, `are_birthdays_today` to check `birthday_visibility` against the caller: allow when owner, when `everyone` and caller shares a server/DM/friendship, or when `friends` and `is_friend_with(auth.uid(), user_id)`.
- Update `get_my_birthday` to also return the visibility value.
- Replace the `user_badge_grants` and `user_badges` SELECT policies with ones that additionally respect `badge_visibility`: self always, `friends` -> `is_friend_with`, `everyone` -> current relationship check, `private` -> self only.

Client:
- `src/components/account-settings/PrivacySettings.tsx`: swap the birthday switch for a `Select`, add a new "Badges" block with a `Select`; both write through the existing upsert / profile update paths.
- `src/hooks/useBirthday.ts`: read and expose the visibility value from `get_my_birthday`; no change needed to `useIsBirthday` / `useBirthdaysToday` since enforcement stays server-side.
- `src/hooks/useUserBadges.ts` and `src/hooks/useBirthdayGrants.ts`: unchanged (RLS filters rows), just ensure query invalidation when the setting changes.
- Add the two new settings to `src/lib/settings/search_index/PrivacySafetyIndex.ts` so they are findable in settings search.
