import { stemWord } from "../text/stem-word";
import type {
  DuplicatePair,
  DuplicateReport,
  IndexedChunk,
  UniverseIndex,
} from "../types/universe";

/**
 * Pairs are computed once down to this floor and filtered by the slider
 * afterwards, so raising the threshold costs nothing.
 */
const SIMILARITY_FLOOR = 0.25;

/**
 * Only the rarest terms of a chunk are used to find candidates. A term that
 * sits in a tenth of the universe connects everything to everything and would
 * turn tens of thousands of chunks into minutes of waiting.
 */
const RARE_TERMS_PER_CHUNK = 12;
const COMMON_TERM_SHARE = 0.02;
const COMMON_TERM_FLOOR = 50;
const MAX_PAIRS = 20000;
const SHARED_WORDS_SHOWN = 8;

/**
 * Two requirements that share every word but one negation are the pair most
 * dangerous to mistake for a duplicate: deleting either one silently flips a
 * rule. Similarity alone puts them at 0.85, so the difference is stated.
 */
const NEGATION_STEMS = new Set(
  [
    "not",
    "no",
    "nor",
    "never",
    "neither",
    "none",
    "without",
    "cannot",
    "dont",
    "doesnt",
    "didnt",
    "isnt",
    "arent",
    "wasnt",
    "werent",
    "wont",
    "wouldnt",
    "couldnt",
    "shouldnt",
    "cant",
    "havent",
    "hasnt",
    "hadnt",
  ].map(stemWord),
);

const denies = (chunk: IndexedChunk): boolean =>
  chunk.stems.some((stem) => NEGATION_STEMS.has(stem));

const cosine = (first: IndexedChunk, second: IndexedChunk): number => {
  const [small, large] =
    first.weights.size <= second.weights.size
      ? [first.weights, second.weights]
      : [second.weights, first.weights];

  let score = 0;
  for (const [stem, weight] of small) {
    score += weight * (large.get(stem) ?? 0);
  }
  return score;
};

const sharedWords = (
  first: IndexedChunk,
  second: IndexedChunk,
  labels: Map<string, string>,
): string[] => {
  const contributions: Array<[string, number]> = [];

  for (const [stem, weight] of first.weights) {
    const other = second.weights.get(stem);
    if (other !== undefined && other > 0) {
      contributions.push([stem, weight * other]);
    }
  }

  return contributions
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, SHARED_WORDS_SHOWN)
    .map(([stem]) => labels.get(stem) ?? stem);
};

const rarestTerms = (chunk: IndexedChunk, index: UniverseIndex): string[] => {
  const ceiling = Math.max(COMMON_TERM_FLOOR, index.size * COMMON_TERM_SHARE);

  return chunk.stems
    .filter((stem) => (index.documentFrequency.get(stem) ?? 0) <= ceiling)
    .toSorted(
      (a, b) =>
        (index.documentFrequency.get(a) ?? 0) -
        (index.documentFrequency.get(b) ?? 0),
    )
    .slice(0, RARE_TERMS_PER_CHUNK);
};

const collectCandidates = (
  position: number,
  index: UniverseIndex,
  chunk: IndexedChunk,
): Set<number> => {
  const candidates = new Set<number>();

  for (const stem of rarestTerms(chunk, index)) {
    for (const other of index.postings.get(stem) ?? []) {
      if (other > position) {
        candidates.add(other);
      }
    }
  }

  return candidates;
};

/**
 * Finds every pair that says the same thing twice, across the whole universe —
 * a row of a table written this morning meets a paragraph from three years ago.
 */
export const findDuplicatePairs = (index: UniverseIndex): DuplicateReport => {
  const pairs: DuplicatePair[] = [];

  index.chunks.forEach((chunk, position) => {
    for (const other of collectCandidates(position, index, chunk)) {
      const candidate = index.chunks[other];
      if (!candidate) {
        continue;
      }

      const similarity = cosine(chunk, candidate);
      if (similarity < SIMILARITY_FLOOR) {
        continue;
      }

      pairs.push({
        firstId: chunk.id,
        polarityDiffers: denies(chunk) !== denies(candidate),
        secondId: candidate.id,
        sharedWords: sharedWords(chunk, candidate, index.surfaceForms),
        similarity,
      });
    }
  });

  const strongestFirst = pairs.toSorted((a, b) => b.similarity - a.similarity);

  return {
    pairs: strongestFirst.slice(0, MAX_PAIRS),
    similarityFloor: SIMILARITY_FLOOR,
    truncatedPairs: Math.max(0, strongestFirst.length - MAX_PAIRS),
  };
};
