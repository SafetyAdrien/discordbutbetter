import { describe, expect, it } from 'vitest';
import {
  formatTypingUsers,
  getTypingUserName,
  isTypingUserFresh,
  type TypingUser,
} from '@/lib/typingIndicator';

const user = (
  userId: string,
  displayName: string | null,
  username: string,
  startedAt: string | null = '2026-11-04T10:00:00.000Z',
): TypingUser => ({
  id: `indicator-${userId}`,
  user_id: userId,
  started_at: startedAt,
  profile: {
    id: userId,
    username,
    display_name: displayName ?? '',
    avatar_url: null,
  },
});

describe('typing indicator helpers', () => {
  it('formats one, two, and multiple typing users', () => {
    expect(formatTypingUsers([user('1', 'Alice', 'alice')])).toBe('Alice écrit');
    expect(formatTypingUsers([
      user('1', 'Alice', 'alice'),
      user('2', null, 'bob'),
    ])).toBe('Alice et bob écrivent');
    expect(formatTypingUsers([
      user('1', 'Alice', 'alice'),
      user('2', 'Bob', 'bob'),
      user('3', 'Claire', 'claire'),
    ])).toBe('Alice, Bob et 1 autre écrivent');
    expect(formatTypingUsers([])).toBe('');
  });

  it('uses a fallback name when profile details are missing', () => {
    const missingProfile = { ...user('1', null, ''), profile: null };
    expect(getTypingUserName(missingProfile)).toBe('Un membre');
    expect(formatTypingUsers([missingProfile])).toBe('Un membre écrit');
  });

  it('only considers timestamps within the active typing window', () => {
    const now = Date.parse('2026-11-04T10:00:10.000Z');
    expect(isTypingUserFresh(user('1', 'Alice', 'alice', '2026-11-04T10:00:09.999Z'), now, 10_000)).toBe(true);
    expect(isTypingUserFresh(user('1', 'Alice', 'alice', '2026-11-04T10:00:00.000Z'), now, 10_000)).toBe(false);
    expect(isTypingUserFresh(user('1', 'Alice', 'alice', '2026-11-04T10:00:11.000Z'), now, 10_000)).toBe(false);
    expect(isTypingUserFresh(user('1', 'Alice', 'alice', null), now, 10_000)).toBe(false);
  });
});
