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
 * Format channel name for display:
 * - All channel types: preserve exact name (case, spaces, special chars)
 */
export function formatChannelName(name: string, _type: string): string {
  return name;
}
