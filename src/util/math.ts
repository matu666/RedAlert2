export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(value, min));
}

export function isBetween(value: number, min: number, max: number): boolean {
  return min <= value && value <= max;
}

export function lerp(start: number, end: number, t: number): number {
  return (1 - t) * start + t * end;
}

export function truncToDecimals(num: number, decimalPlaces: number): number {
  if (!num) return num; // Or handle as 0 if that's more appropriate
  const factor = 10 ** decimalPlaces;
  return (num >= 0 ? Math.floor(num * factor) : Math.ceil(num * factor)) / factor;
}

export function roundToDecimals(num: number, decimalPlaces: number): number {
  if (!num) return num; // Or handle as 0
  const factor = 10 ** decimalPlaces;
  return Math.round(num * factor) / factor;
}

export function floorTo(value: number, significance: number): number {
  if (significance === 0) return value; // Avoid division by zero, or throw error
  return Math.floor(value / significance) * significance;
}

/**
 * FNV-1a 32-bit hash function.
 * @param data The Uint8Array data to hash.
 * @returns The 32-bit hash as an unsigned integer.
 */
export function fnv32a(data: Uint8Array): number {
  let hash = 0x811c9dc5; // FNV_offset_basis
  for (let i = 0; i < data.length; ++i) {
    hash ^= data[i];
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    // In JavaScript, the result of bitwise operations is a 32-bit signed integer.
    // To ensure the intermediate hash value remains within the 32-bit unsigned integer range
    // and behaves like the original C/C++ FNV algorithm (which uses unsigned integers),
    // we should ensure operations mimic that. However, the given JS code does this:
    // hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    // This addition can lead to numbers larger than 32 bits before the final `>>> 0`.
    // The `>>> 0` at the end converts the final result to an unsigned 32-bit integer.
    // The original provided code for fnv32a was: (t ^= e[i]), (t += (t << 1) + (t << 4) + (t << 7) + (t << 8) + (t << 24));
    // Let's stick to the direct translation of the provided JS snippet's logic.
  }
  return hash >>> 0;
} 