import { uuidToSnowflake } from './snowflake';

/**
 * Returns true when a message content mentions the current user, either:
 * - Directly via <@USER_ID> / <@!USER_ID> (UUID or Snowflake)
 * - Via one of the user's roles <@&ROLE_ID>
 * - Via the special @everyone / @here literals
 */
export function messageMentionsMe(
  content: string | null | undefined,
  currentUserId: string | undefined,
  currentUserRoleIds: string[] = []
): boolean {
  if (!content) return false;

  // @everyone / @here literals (must be word-boundary)
  if (/(^|\s)@(everyone|here)(\s|$|[.,!?;:])/.test(content)) return true;

  if (!currentUserId) return false;

  // Direct user mention
  const mySnowflake = uuidToSnowflake(currentUserId);
  const userRegex = new RegExp(`<@!?(${escape(currentUserId)}|${escape(mySnowflake)})>`, 'i');
  if (userRegex.test(content)) return true;

  // Role mention (any role the user owns)
  for (const roleId of currentUserRoleIds) {
    if (!roleId) continue;
    const roleSnowflake = uuidToSnowflake(roleId);
    const roleRegex = new RegExp(`<@&(${escape(roleId)}|${escape(roleSnowflake)})>`, 'i');
    if (roleRegex.test(content)) return true;
  }

  return false;
}

function escape(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
