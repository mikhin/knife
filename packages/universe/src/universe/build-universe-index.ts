import { tokenizeText } from "../text/tokenize-text";
import type { Chunk } from "@knife/contract";
import type { IndexedChunk, UniverseIndex } from "../types/universe";
import type { Token } from "../types/token";

type Draft = {
  chunk: IndexedChunk;
  termFrequency: Map<string, number>;
};

const countTerms = (tokens: Token[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (!token.isStop) {
      counts.set(token.stem, (counts.get(token.stem) ?? 0) + 1);
    }
  }
  return counts;
};

const pickSurfaceForms = (chunks: IndexedChunk[]): Map<string, string> => {
  const counts = new Map<string, Map<string, number>>();

  for (const chunk of chunks) {
    for (const token of chunk.tokens) {
      if (token.isStop) {
        continue;
      }
      const forms = counts.get(token.stem) ?? new Map<string, number>();
      const surface = token.surface.toLowerCase();
      forms.set(surface, (forms.get(surface) ?? 0) + 1);
      counts.set(token.stem, forms);
    }
  }

  const labels = new Map<string, string>();
  for (const [stem, forms] of counts) {
    const best = [...forms].toSorted(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0];
    labels.set(stem, best?.[0] ?? stem);
  }
  return labels;
};

const draftChunk = (chunk: Chunk): Draft => {
  const tokens = tokenizeText(chunk.text);
  const termFrequency = countTerms(tokens);
  const stopCount = tokens.filter((token) => token.isStop).length;

  return {
    chunk: {
      contentCount: tokens.length - stopCount,
      createdAt: chunk.createdAt,
      id: chunk.id,
      stems: [...termFrequency.keys()],
      stopRatio: tokens.length === 0 ? 0 : stopCount / tokens.length,
      text: chunk.text,
      tokens,
      weights: new Map<string, number>(),
      wordCount: tokens.length,
    },
    termFrequency,
  };
};

const fillWeights = (draft: Draft, idf: Map<string, number>): void => {
  const raw = new Map<string, number>();
  let squared = 0;

  for (const [stem, frequency] of draft.termFrequency) {
    const weight = (1 + Math.log(frequency)) * (idf.get(stem) ?? 0);
    raw.set(stem, weight);
    squared += weight * weight;
  }

  const norm = Math.sqrt(squared);
  for (const [stem, weight] of raw) {
    draft.chunk.weights.set(stem, norm === 0 ? 0 : weight / norm);
  }
};

/**
 * Builds everything the checks need, in memory, from the chunks alone.
 * Nothing here is persisted: reopening the project rebuilds it from the text,
 * so a verdict can never be older than the wording it judges.
 */
export const buildUniverseIndex = (chunks: Chunk[]): UniverseIndex => {
  const drafts = chunks.map(draftChunk);
  const documentFrequency = new Map<string, number>();
  const postings = new Map<string, number[]>();

  drafts.forEach((draft, position) => {
    for (const stem of draft.chunk.stems) {
      documentFrequency.set(stem, (documentFrequency.get(stem) ?? 0) + 1);
      const posting = postings.get(stem);
      if (posting) {
        posting.push(position);
      } else {
        postings.set(stem, [position]);
      }
    }
  });

  const size = drafts.length;
  const idf = new Map<string, number>();
  for (const [stem, frequency] of documentFrequency) {
    idf.set(stem, Math.log(1 + size / frequency));
  }

  for (const draft of drafts) {
    fillWeights(draft, idf);
  }

  const indexed = drafts.map((draft) => draft.chunk);

  return {
    byId: new Map(indexed.map((chunk) => [chunk.id, chunk])),
    chunks: indexed,
    documentFrequency,
    idf,
    postings,
    size,
    surfaceForms: pickSurfaceForms(indexed),
  };
};
