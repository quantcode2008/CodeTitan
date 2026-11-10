/**
 * Brand Source Key Generator
 * 
 * Auto-generates sequential, immutable brand source keys per workspace (e.g. S-001, S-002...).
 * Evaluates existing keys, extracts numerical identifiers, and formats with 3-digit zero padding.
 */

export function generateNextSourceKey(
  existingKeys: string[],
  prefix = "S"
): string {
  if (!existingKeys || existingKeys.length === 0) {
    return `${prefix}-001`;
  }

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedPrefix}-(\\d+)$`, "i");

  let highestIndex = 0;

  for (const key of existingKeys) {
    if (!key) continue;
    const match = key.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestIndex) {
        highestIndex = num;
      }
    }
  }

  const nextIndex = highestIndex + 1;
  const paddedIndex = String(nextIndex).padStart(3, "0");
  return `${prefix}-${paddedIndex}`;
}

/**
 * Returns the next numerical index integer for sequential key generation.
 */
export function getNextKeyIndex(existingKeys: string[], prefix = "S"): number {
  if (!existingKeys || existingKeys.length === 0) {
    return 1;
  }
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedPrefix}-(\\d+)$`, "i");
  let highestIndex = 0;
  for (const key of existingKeys) {
    if (!key) continue;
    const match = key.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestIndex) {
        highestIndex = num;
      }
    }
  }
  return highestIndex + 1;
}

/**
 * Validates whether a given key matches the canonical format.
 */
export function isValidSourceKey(key: string, prefix = "S"): boolean {
  if (!key) return false;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedPrefix}-\\d{3,}$`, "i");
  return regex.test(key.trim());
}
