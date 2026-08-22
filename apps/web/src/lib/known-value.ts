/**
 * A setting read back from the browser is a string somebody else wrote —
 * an older version of this app, most of the time, naming a choice that has
 * since been dropped. It is checked against what this version knows, so a
 * stale setting reads as the default instead of reaching the code as a
 * value it was never written to handle.
 */
export const knownValue = <T extends string>(
  known: readonly T[],
  fallback: T,
): { decode: (stored: string) => T; encode: (value: T) => string } => ({
  decode: (stored) => known.find((value) => value === stored) ?? fallback,
  encode: (value) => value,
});

/** The same for a number: an unreadable one is no number at all. */
export const knownNumber = (
  fallback: number,
): {
  decode: (stored: string) => number;
  encode: (value: number) => string;
} => ({
  decode: (stored) => {
    // An empty string reads as zero, which is a threshold, not a refusal
    const value = stored.trim() === "" ? Number.NaN : Number(stored);
    return Number.isFinite(value) ? value : fallback;
  },
  encode: String,
});
