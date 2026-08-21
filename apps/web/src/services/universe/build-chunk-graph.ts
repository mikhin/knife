import type { Chunk } from "@knife/contract";
import type {
  ChunkGraph,
  ChunkLink,
  ChunkNode,
  DuplicatePair,
} from "@/types/universe";

const PREVIEW_LENGTH = 120;
const MAX_NODES = 1200;

type Marks = {
  dangling: ReadonlySet<string>;
  water: ReadonlySet<string>;
};

const preview = (text: string): string =>
  text.length <= PREVIEW_LENGTH ? text : `${text.slice(0, PREVIEW_LENGTH)}...`;

/**
 * What gets drawn first when the universe outgrows the canvas: everything a
 * check has something to say about, then the rest until the budget runs out.
 */
const rank = (
  id: string,
  linked: ReadonlySet<string>,
  marks: Marks,
): number => {
  if (linked.has(id)) {
    return 0;
  }
  if (marks.water.has(id) || marks.dangling.has(id)) {
    return 1;
  }
  return 2;
};

/**
 * Rebuilt in the main thread every time the similarity slider moves — the
 * pairs are already known, so raising the threshold costs a filter, not a run.
 */
export const buildChunkGraph = (
  chunks: Chunk[],
  pairs: DuplicatePair[],
  marks: Marks,
): ChunkGraph => {
  const links: ChunkLink[] = pairs.map((pair) => ({
    similarity: pair.similarity,
    source: pair.firstId,
    target: pair.secondId,
  }));

  const linked = new Set(links.flatMap((link) => [link.source, link.target]));

  const nodes: ChunkNode[] = chunks
    .map((chunk) => ({
      createdAt: chunk.createdAt,
      id: chunk.id,
      isDangling: marks.dangling.has(chunk.id),
      isWater: marks.water.has(chunk.id),
      preview: preview(chunk.text),
    }))
    .toSorted((a, b) => rank(a.id, linked, marks) - rank(b.id, linked, marks))
    .slice(0, MAX_NODES);

  const drawn = new Set(nodes.map((node) => node.id));

  return {
    droppedNodes: Math.max(0, chunks.length - nodes.length),
    links: links.filter(
      (link) => drawn.has(link.source) && drawn.has(link.target),
    ),
    nodes,
  };
};
