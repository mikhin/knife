import type { UniverseIndex, WordProfile } from "@/types/universe";

const MAX_COMPANIONS = 24;

/**
 * One word, both answers at once: every chunk it appears in and the words it
 * keeps company with. Clicking a node and typing into search land here.
 */
export const describeWord = (
  index: UniverseIndex,
  stem: string,
): WordProfile => {
  const positions = index.postings.get(stem) ?? [];
  const together = new Map<string, number>();

  for (const position of positions) {
    const chunk = index.chunks[position];
    if (!chunk) {
      continue;
    }
    for (const neighbour of chunk.stems) {
      if (neighbour !== stem) {
        together.set(neighbour, (together.get(neighbour) ?? 0) + 1);
      }
    }
  }

  const companions = [...together]
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_COMPANIONS)
    .map(([companion, chunkCount]) => ({
      chunkCount,
      label: index.surfaceForms.get(companion) ?? companion,
      stem: companion,
    }));

  return {
    companions,
    label: index.surfaceForms.get(stem) ?? stem,
    occurrences: positions
      .map((position) => index.chunks[position])
      .filter((chunk) => chunk !== undefined)
      .map((chunk) => ({
        chunkId: chunk.id,
        spans: chunk.tokens
          .filter((token) => token.stem === stem)
          .map((token) => ({ end: token.end, start: token.start })),
      })),
    stem,
  };
};
