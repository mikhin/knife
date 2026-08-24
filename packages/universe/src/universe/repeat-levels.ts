import type { DuplicatePair } from "../types/universe";

export type RepeatLevelId = "almost" | "close" | "loose";

export type RepeatLevel = {
  /** Similarity at which the level starts; pairs below it are not repeats here. */
  from: number;
  id: RepeatLevelId;
  label: string;
};

/**
 * Three named levels instead of a slider. A slider asked the reader to guess
 * whether 0.75 is a lot, and only showed the consequence after dragging;
 * every level here says up front how many repeats it will show.
 *
 * They live in the core rather than on the screen because the screen is no
 * longer the only reader: an agent asking for repeats and a person looking at
 * them must mean the same thing by "almost the same", or the two will argue
 * about a pair that only one of them counts.
 */
export const REPEAT_LEVELS: readonly RepeatLevel[] = [
  { from: 0.9, id: "almost", label: "Almost the same" },
  { from: 0.6, id: "close", label: "Close" },
  { from: 0.25, id: "loose", label: "Loosely alike" },
];

export const repeatLevel = (id: RepeatLevelId): RepeatLevel => {
  const level = REPEAT_LEVELS.find((candidate) => candidate.id === id);
  if (!level) {
    throw new Error(`No such repeat level: ${id}`);
  }
  return level;
};

/** Pairs the level admits, strongest first — the order they arrive in. */
export const pairsAtLevel = (
  pairs: readonly DuplicatePair[],
  from: number,
): DuplicatePair[] => pairs.filter((pair) => pair.similarity >= from);
