import { tokenizeText } from "@/services/text/tokenize-text";
import type { SearchHit, UniverseIndex } from "@/types/universe";

const spansOf = (
  tokens: Array<{ end: number; start: number; stem: string }>,
  wanted: Set<string>,
): Array<{ end: number; start: number }> =>
  tokens
    .filter((token) => wanted.has(token.stem))
    .map((token) => ({ end: token.end, start: token.start }));

/**
 * Search runs on stems, which is why looking for "shift" also returns the
 * chunk that only ever says "shifts".
 */
export const searchUniverse = (
  index: UniverseIndex,
  query: string,
): SearchHit[] => {
  const wanted = new Set(
    tokenizeText(query)
      .filter((token) => !token.isStop)
      .map((token) => token.stem),
  );
  if (wanted.size === 0) {
    return [];
  }

  const candidates = [...wanted]
    .map((stem) => index.postings.get(stem) ?? [])
    .toSorted((a, b) => a.length - b.length);

  const narrowest = candidates[0] ?? [];

  return narrowest
    .map((position) => index.chunks[position])
    .filter((chunk) => chunk !== undefined)
    .filter((chunk) => [...wanted].every((stem) => chunk.weights.has(stem)))
    .map((chunk) => ({
      chunkId: chunk.id,
      spans: spansOf(chunk.tokens, wanted),
    }));
};
