

# Add "Copier l'ID" to Channel and Category Context Menus

## Problem
Channel and category context menus in `ChannelList.tsx` don't have a "Copier l'ID" option. All other entity context menus (messages, servers, threads, members, polls) already have one with Snowflake conversion.

## Changes

| File | Location | Change |
|------|----------|--------|
| `ChannelList.tsx` | Category context menu (line ~316-336) | Add "Copier l'ID" item using `uuidToSnowflake(category.id)` |
| `ChannelList.tsx` | Channel context menu (line ~720-753) | Add "Copier l'ID" item using `uuidToSnowflake(channel.id)` |
| `ChannelList.tsx` | Imports (top) | Add `Hash` icon import (if missing), ensure `uuidToSnowflake` is imported |

### Category context menu — add after "Copier le lien" / before separator+delete:
```tsx
<ContextMenuItem onClick={() => copyToClipboard(uuidToSnowflake(category.id), "ID de catégorie copié")}>
  <Hash className="w-4 h-4 mr-2" />
  Copier l'ID
</ContextMenuItem>
```

### Channel context menu — add after "Copier le lien":
```tsx
<ContextMenuItem onClick={() => copyToClipboard(uuidToSnowflake(channel.id), "ID du salon copié")}>
  <Hash className="w-4 h-4 mr-2" />
  Copier l'ID
</ContextMenuItem>
```

