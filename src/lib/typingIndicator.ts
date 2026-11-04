export interface TypingProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TypingUser {
  id: string;
  user_id: string;
  started_at: string | null;
  profile: TypingProfile | null;
}

export function getTypingUserName(user: TypingUser): string {
  return user.profile?.display_name?.trim() || user.profile?.username?.trim() || 'Un membre';
}

export function formatTypingUsers(users: TypingUser[]): string {
  if (users.length === 0) return '';
  if (users.length === 1) return `${getTypingUserName(users[0])} écrit`;
  if (users.length === 2) {
    return `${getTypingUserName(users[0])} et ${getTypingUserName(users[1])} écrivent`;
  }

  const others = users.length - 2;
  return `${getTypingUserName(users[0])}, ${getTypingUserName(users[1])} et ${others} autre${others > 1 ? 's' : ''} écrivent`;
}

export function isTypingUserFresh(user: TypingUser, now: number, expiryMs: number): boolean {
  if (!user.started_at) return false;
  const startedAt = Date.parse(user.started_at);
  return Number.isFinite(startedAt) && startedAt <= now && now - startedAt < expiryMs;
}
