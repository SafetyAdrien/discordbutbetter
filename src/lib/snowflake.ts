/**
 * Snowflake ID System
 * Converts UUIDs to 18-digit Snowflake-like IDs and provides bidirectional lookup
 */

// Registry to store UUID <-> Snowflake mappings for reverse lookups
const uuidToSnowflakeMap = new Map<string, string>();
const snowflakeToUuidMap = new Map<string, string>();

/**
 * Validates if a string looks like a valid UUID
 */
function isValidUuid(str: string): boolean {
  // UUID format: 8-4-4-4-12 hex characters with dashes, or 32 hex characters without
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hexOnlyRegex = /^[0-9a-f]{32}$/i;
  return uuidRegex.test(str) || hexOnlyRegex.test(str);
}

/**
 * Converts a UUID to an 18-digit Snowflake-like ID
 * This creates a consistent, reproducible 18-digit number from any UUID
 * Returns the original string if it's not a valid UUID (e.g., temp IDs)
 */
export function uuidToSnowflake(uuid: string): string {
  // Return original if not a valid UUID (e.g., temp-123456789)
  if (!uuid || !isValidUuid(uuid)) {
    return uuid;
  }

  // Check cache first
  const cached = uuidToSnowflakeMap.get(uuid);
  if (cached) return cached;

  // Remove dashes and take first 15 hex characters
  const hex = uuid.replace(/-/g, '').slice(0, 15);
  // Convert hex to BigInt and ensure 18 digits
  const bigInt = BigInt('0x' + hex);
  // Pad with leading zeros if needed, or truncate to 18 digits
  const snowflake = bigInt.toString().padStart(18, '0').slice(0, 18);
  
  // Cache both directions
  uuidToSnowflakeMap.set(uuid, snowflake);
  snowflakeToUuidMap.set(snowflake, uuid);
  
  return snowflake;
}

/**
 * Looks up a UUID from a Snowflake ID
 * Returns undefined if the Snowflake ID is not in the registry
 */
export function snowflakeToUuid(snowflake: string): string | undefined {
  return snowflakeToUuidMap.get(snowflake);
}

/**
 * Registers a UUID in the Snowflake registry for reverse lookups
 * This should be called when loading users/members data
 */
export function registerSnowflakeMapping(uuid: string): string {
  return uuidToSnowflake(uuid);
}

/**
 * Registers multiple UUIDs at once
 */
export function registerSnowflakeMappings(uuids: string[]): void {
  uuids.forEach(uuid => uuidToSnowflake(uuid));
}

/**
 * Checks if a string is a valid 18-digit Snowflake ID
 */
export function isValidSnowflake(id: string): boolean {
  return /^\d{18}$/.test(id);
}

/**
 * Clears the Snowflake registry (useful for testing or cleanup)
 */
export function clearSnowflakeRegistry(): void {
  uuidToSnowflakeMap.clear();
  snowflakeToUuidMap.clear();
}
