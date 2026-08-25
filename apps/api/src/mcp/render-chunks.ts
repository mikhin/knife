import { renderWindow } from "@/mcp/render-window";

export type ChunkLine = {
  id: string;
  text: string;
};

export type ChunksPage = {
  /** Where this window starts, counted from the oldest chunk in the universe. */
  from: number;
  listed: ChunkLine[];
  project: string;
  size: number;
};

/**
 * The universe read plainly, a window at a time. The order is the order the
 * chunks arrived in, which is nothing more than a way to page through the
 * same universe twice and get the same pages.
 */
export const renderChunks = (page: ChunksPage): string => {
  const head = `Project "${page.project}" holds ${page.size} chunks.`;
  const window = renderWindow({
    from: page.from,
    listed: page.listed.length,
    size: page.size,
    what: "chunk",
  });

  if (page.listed.length === 0) {
    return `${head}\n${window}`;
  }

  const lines = page.listed.map((line) => `${line.id}  ${line.text}`);
  return `${head}\n${window}\n\n${lines.join("\n")}`;
};
