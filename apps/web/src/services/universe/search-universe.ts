import { tokenizeText } from "@/services/text/tokenize-text";
import type { SearchHit, UniverseIndex } from "@/types/universe";

/**
 * Words the query could mean. A whole word matches by stem, so "shift" still
 * finds "shifts"; a fragment matches by what it is part of, so "shif" finds
 * them too, and nobody has to know the exact wording to look for it.
 */
const meanings = (index: UniverseIndex, word: string): Set<string> => {
  const matched = new Set<string>();
  const fragment = word.toLowerCase();

  for (const token of tokenizeText(word)) {
    if (!token.isStop && index.postings.has(token.stem)) {
      matched.add(token.stem);
    }
  }

  for (const [stem, label] of index.surfaceForms) {
    if (stem.includes(fragment) || label.includes(fragment)) {
      matched.add(stem);
    }
  }

  return matched;
};

const spansOf = (
  tokens: Array<{ end: number; start: number; stem: string }>,
  wanted: Set<string>,
): Array<{ end: number; start: number }> =>
  tokens
    .filter((token) => wanted.has(token.stem))
    .map((token) => ({ end: token.end, start: token.start }));

/** A word that carries no meaning of its own is not searched for. */
const isServiceWord = (word: string): boolean => {
  const tokens = tokenizeText(word);
  return tokens.length > 0 && tokens.every((token) => token.isStop);
};

/**
 * Every word of the query has to be in the chunk; each of them may be there
 * in any of its meanings.
 */
export const searchUniverse = (
  index: UniverseIndex,
  query: string,
): SearchHit[] => {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !isServiceWord(word));
  if (words.length === 0) {
    return [];
  }

  const perWord = words.map((word) => meanings(index, word));
  if (perWord.some((matched) => matched.size === 0)) {
    return [];
  }

  const all = new Set(perWord.flatMap((matched) => [...matched]));
  const narrowest = perWord.toSorted((a, b) => a.size - b.size)[0] ?? new Set();

  const candidates = new Set(
    [...narrowest].flatMap((stem) => index.postings.get(stem) ?? []),
  );

  return [...candidates]
    .map((position) => index.chunks[position])
    .filter((chunk) => chunk !== undefined)
    .filter((chunk) =>
      perWord.every((matched) =>
        [...matched].some((stem) => chunk.weights.has(stem)),
      ),
    )
    .map((chunk) => ({
      chunkId: chunk.id,
      spans: spansOf(chunk.tokens, all),
    }));
};
