/**
 * Type guard that checks if a value is not null and not undefined.
 * @param value The value to check.
 * @returns True if the value is not null and not undefined, false otherwise.
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value != null; // In JavaScript, `!= null` checks for both null and undefined.
} 