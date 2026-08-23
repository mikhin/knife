import { tokenizeText } from "../text/tokenize-text";
import type { SearchHit, UniverseIndex } from "../types/universe";
import type { Token } from "../types/token";

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
 * When the query is nothing but service words, they are all there is to go
 * on. Service words carry no meaning and so are never indexed, but they are
 * still written in the text, so the letters are looked for there instead:
 * "for" finds the preposition, and "format" along with it.
 */
const holds = (token: Token, fragment: string): boolean =>
  token.surface.toLowerCase().includes(fragment);

const literalHits = (index: UniverseIndex, words: string[]): SearchHit[] => {
  const fragments = words.map((word) => word.toLowerCase());

  return index.chunks
    .filter((chunk) =>
      fragments.every((fragment) =>
        chunk.tokens.some((token) => holds(token, fragment)),
      ),
    )
    .map((chunk) => ({
      chunkId: chunk.id,
      spans: chunk.tokens
        .filter((token) => fragments.some((fragment) => holds(token, fragment)))
        .map((token) => ({ end: token.end, start: token.start })),
    }));
};

/**
 * Every word of the query has to be in the chunk; each of them may be there
 * in any of its meanings.
 */
export const searchUniverse = (
  index: UniverseIndex,
  query: string,
): SearchHit[] => {
  const typed = query.trim().split(/\s+/).filter(Boolean);
  const words = typed.filter((word) => !isServiceWord(word));
  if (words.length === 0) {
    return typed.length === 0 ? [] : literalHits(index, typed);
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
