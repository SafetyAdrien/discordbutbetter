/**
 * Converts a UUID to an 18-digit Snowflake-like ID
 * This creates a consistent, reproducible 18-digit number from any UUID
 */
export function uuidToSnowflake(uuid: string): string {
  // Remove dashes and take first 15 hex characters
  const hex = uuid.replace(/-/g, '').slice(0, 15);
  // Convert hex to BigInt and ensure 18 digits
  const bigInt = BigInt('0x' + hex);
  // Pad with leading zeros if needed, or truncate to 18 digits
  const snowflake = bigInt.toString().padStart(18, '0').slice(0, 18);
  return snowflake;
}
