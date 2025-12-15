import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize text for search matching:
 * - Lowercase
 * - Remove accents
 * - Remove separators (spaces, dashes, underscores)
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[\s_-]+/g, '');        // Remove spaces, dashes, underscores
}

/**
 * Format channel name based on type:
 * - Text/forum/announcement: kebab-case (lowercase, dashes)
 * - Voice/stage/others: preserve exact name
 */
export function formatChannelName(name: string, type: string): string {
  // Text-based channels: force kebab-case
  if (type === 'text' || type === 'forum' || type === 'announcement') {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, '-')            // Spaces → dashes
      .replace(/_+/g, '-')             // Underscores → dashes
      .replace(/-+/g, '-')             // Multiple dashes → single
      .replace(/[^a-z0-9-]/g, '');     // Keep only alphanumeric + dashes
  }
  // Voice/stage/other channels: keep exact name
  return name;
}
