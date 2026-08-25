import type { ChunkLine } from "@/mcp/render-chunks";

export type AddedChunks = {
  /** Chunks the text cut down to, whether or not they fitted the answer. */
  added: number;
  listed: ChunkLine[];
  project: string;
};

const chunksSaid = (count: number): string =>
  count === 1 ? "1 chunk" : `${count} chunks`;

/**
 * A pass of text dissolves into the universe: the sheet is not stored and no
 * chunk remembers which one it came from. So what comes back is the chunks
 * themselves under their new ids — the only handle anybody, agent or person,
 * will ever have on them again.
 */
export const renderAdded = (added: AddedChunks): string => {
  if (added.added === 0) {
    return `Nothing was added to "${added.project}": that text cut down to no chunks.`;
  }

  const missing = added.added - added.listed.length;
  const head =
    missing > 0
      ? `Added ${chunksSaid(added.added)} to "${added.project}", ${added.listed.length} listed, ${missing} not listed.`
      : `Added ${chunksSaid(added.added)} to "${added.project}".`;
  const lines = added.listed.map((line) => `${line.id}  ${line.text}`);

  return `${head}\n\n${lines.join("\n")}`;
};
