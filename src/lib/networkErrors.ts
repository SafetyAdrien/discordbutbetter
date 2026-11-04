export function isTransientNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('status' in error && typeof error.status === 'number' && error.status >= 100) return false;

  const message = 'message' in error ? String(error.message) : '';
  return /failed to fetch|network|socket|connection (?:reset|refused|closed|lost)|timed out|timeout|load failed/i.test(message);
}
