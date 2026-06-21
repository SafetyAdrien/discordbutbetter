import { uuidToSnowflake } from '@/lib/snowflake';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isDirectMentionForUser(content: string | null | undefined, userId: string) {
  if (!content || !userId) return false;
  const snowflake = uuidToSnowflake(userId);
  const ids = [userId, snowflake].filter(Boolean).map(escapeRegExp).join('|');
  return new RegExp(`<@!?(${ids})>`).test(content);
}