import { useMemo } from 'react';
import { useServerUnreadCounts } from './useServerUnreadCounts';
import { useDMMentionCounts } from './useDMMentionCounts';

/**
 * Total mention count = sum of server channel mentions + DM mentions.
 * Drives the red badge on the Inbox / Notifications icon (desktop + mobile).
 */
export function useTotalMentionCount(): number {
  const { unreadInfo } = useServerUnreadCounts();
  const { totalMentionCount: dmMentions } = useDMMentionCounts();

  return useMemo(() => {
    const serverMentions = Object.values(unreadInfo).reduce(
      (sum, info) => sum + (info?.mentionCount || 0),
      0,
    );
    return serverMentions + dmMentions;
  }, [unreadInfo, dmMentions]);
}
