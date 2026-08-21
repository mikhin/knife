import type {
  UniverseIndex,
  WordGraph,
  WordLink,
  WordNode,
} from "@/types/universe";

const MAX_NODES = 400;
const MAX_LINKS = 1500;
const TERMS_PER_CHUNK = 12;
const MIN_LINK_WEIGHT = 2;

const linkKey = (first: string, second: string): string =>
  first < second ? `${first} ${second}` : `${second} ${first}`;

const topNodes = (index: UniverseIndex, limit: number): WordNode[] =>
  [...index.documentFrequency]
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([stem, chunkCount]) => ({
      chunkCount,
      label: index.surfaceForms.get(stem) ?? stem,
      stem,
    }));

const strongestTerms = (
  stems: string[],
  index: UniverseIndex,
  kept: Set<string>,
): string[] =>
  stems
    .filter((stem) => kept.has(stem))
    .toSorted((a, b) => (index.idf.get(b) ?? 0) - (index.idf.get(a) ?? 0))
    .slice(0, TERMS_PER_CHUNK);

/**
 * Words that travel together, one node per stem. The node and link budgets go
 * to the heaviest ones and whatever is left over is reported rather than
 * quietly dropped: a trimmed graph that looks complete is a lie.
 */
export const buildWordGraph = (index: UniverseIndex): WordGraph => {
  const nodes = topNodes(index, MAX_NODES);
  const kept = new Set(nodes.map((node) => node.stem));
  const weights = new Map<string, number>();

  for (const chunk of index.chunks) {
    const terms = strongestTerms(chunk.stems, index, kept);
    for (let i = 0; i < terms.length; i += 1) {
      for (let j = i + 1; j < terms.length; j += 1) {
        const key = linkKey(terms[i] ?? "", terms[j] ?? "");
        weights.set(key, (weights.get(key) ?? 0) + 1);
      }
    }
  }

  const all: WordLink[] = [...weights]
    .filter(([, weight]) => weight >= MIN_LINK_WEIGHT)
    .map(([key, weight]) => {
      const [source = "", target = ""] = key.split(" ");
      return { source, target, weight };
    })
    .toSorted((a, b) => b.weight - a.weight);

  return {
    droppedLinks: Math.max(0, all.length - MAX_LINKS),
    droppedNodes: Math.max(0, index.documentFrequency.size - nodes.length),
    links: all.slice(0, MAX_LINKS),
    nodes,
  };
};
