

## Plan: Aligner les permissions du salon Annonces sur celles du salon Texte

Le salon Annonces est fonctionnellement identique au salon Texte (avec le suivi/publication en plus). Les permissions announcement-specific (`create_announcements`, `edit_announcements`, `delete_announcements`, `moderate_announcements`, etc.) sont obsoletes et doivent etre remplacees par les permissions textuelles standard.

### Changements

**1. `src/components/channels/AnnouncementChannel.tsx`**

Remplacer le bloc de permissions (lignes 216-251) pour utiliser exactement les memes permissions que `ChatArea.tsx` + `publish_messages` et `follow_announcements` (les 2 seules specificites annonces conservees):

```typescript
const { can: canPerm, isLoading: permissionsLoading } = useMultipleChannelPermissions(channel.id, [
  'send_messages',
  'attach_files',
  'add_reactions',
  'create_polls',
  'mention_everyone',
  'create_public_threads',
  'manage_messages',
  'manage_channels',
  // Announcement-only extras
  'publish_messages',
  'follow_announcements',
]);

const canSendMessages = isAdminOrOwner || canPerm('send_messages');
const canAttachFiles = isAdminOrOwner || canPerm('attach_files');
const canAddReactions = isAdminOrOwner || canPerm('add_reactions');
const canCreatePolls = isAdminOrOwner || canPerm('create_polls');
const canManageMessages = isAdminOrOwner || canPerm('manage_messages');
const canManageChannels = isAdminOrOwner || canPerm('manage_channels');
// Announcement extras
const canPublishMessages = isAdminOrOwner || canPerm('publish_messages');
const canFollowAnnouncements = isAdminOrOwner || canPerm('follow_announcements');
```

Remove all references to `canCreateAnnouncements`, `canEditAnnouncements`, `canDeleteAnnouncements`, `canPinAnnouncements`, `canModerateAnnouncements`, `canManageAnnouncements`. Replace their usages in the template with standard equivalents (`canManageMessages` for edit/delete/pin of others' messages, `canSendMessages` for creating content).

**2. `src/constants/permissions.ts`**

- Remove the entire `announcement` permission category (lines 172-186) since those permissions are now covered by `text` + `general` + `moderation`.
- Update `CHANNEL_TYPE_CATEGORIES.announcement` from `['general', 'announcement', 'text', 'threads', 'polls']` to `['general', 'text', 'threads', 'polls']` (same as text channels).
- Remove `'announcement'` from `ROLE_PERMISSION_CATEGORIES`.
- Clean up the `ServerPermission` type to remove the announcement-specific union members (keep only `publish_messages` and `follow_announcements`).

