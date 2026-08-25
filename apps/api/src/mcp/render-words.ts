import { renderWindow } from "@/mcp/render-window";

export type WordLine = {
  chunkCount: number;
  label: string;
  stem: string;
};

export type WordsPage = {
  from: number;
  listed: WordLine[];
  project: string;
  size: number;
  /** Words in the universe, counted by stem rather than by spelling. */
  words: number;
};

const said = (line: WordLine): string => {
  const chunks =
    line.chunkCount === 1 ? "1 chunk" : `${line.chunkCount} chunks`;
  const word =
    line.label === line.stem ? line.label : `${line.label} (${line.stem})`;

  return `${word}  ${chunks}`;
};

/**
 * The vocabulary of a universe, commonest first. One row per stem: "shift"
 * and "shifts" are one word here, exactly as they are one hit in search, so
 * a count is a count of meanings and not of spellings.
 */
export const renderWords = (page: WordsPage): string => {
  const head = `Project "${page.project}" holds ${page.size} chunks, ${page.words} words.`;
  const window = renderWindow({
    from: page.from,
    listed: page.listed.length,
    size: page.words,
    what: "word",
  });

  if (page.listed.length === 0) {
    return `${head}\n${window}`;
  }

  return `${head}\n${window}\n\n${page.listed.map(said).join("\n")}`;
};
