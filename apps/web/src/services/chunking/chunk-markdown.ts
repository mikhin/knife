import { splitIntoSentences } from "@/services/chunking/split-into-sentences";
import { stripInlineMarkup } from "@/services/chunking/strip-inline-markup";

const HEADING = /^\s{0,3}#{1,6}\s+(.*)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const BLOCKQUOTE = /^\s*>\s?(.*)$/;
const FENCE = /^\s*(```|~~~)/;
const THEMATIC_BREAK = /^\s{0,3}([-*_])\s*(?:\1\s*){2,}$/;
const TABLE_ROW = /^\s*\|.*\|?\s*$/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/**
 * A table row becomes ordinary text, so a row and a paragraph saying the same
 * thing meet each other as duplicates instead of living in separate worlds.
 */
const tableRowToText = (line: string): string =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(stripInlineMarkup)
    .filter(Boolean)
    .join(" — ");

const skipFrontMatter = (lines: string[]): number => {
  if (lines[0]?.trim() !== "---") {
    return 0;
  }
  const closing = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  return closing > 0 ? closing + 1 : 0;
};

type CodeSplit = {
  code: string[];
  prose: string[];
};

/**
 * Code blocks are pulled out before anything else and never cut on dots —
 * a snippet split mid-expression is noise in every check downstream.
 */
const separateCode = (lines: string[]): CodeSplit => {
  const code: string[] = [];
  const prose: string[] = [];
  let fence: string | undefined;
  let buffer: string[] = [];

  for (const line of lines) {
    if (fence === undefined && FENCE.test(line)) {
      fence = line.trim().slice(0, 3);
      prose.push("");
      continue;
    }

    if (fence !== undefined && line.trim().startsWith(fence)) {
      const snippet = buffer.join("\n").trim();
      if (snippet && /\p{L}/u.test(snippet)) {
        code.push(snippet);
      }
      buffer = [];
      fence = undefined;
      continue;
    }

    if (fence === undefined) {
      prose.push(line);
    } else {
      buffer.push(line);
    }
  }

  // A fence nobody closed is a typo, not a licence to swallow the rest of the
  // file: what follows it is read as prose.
  prose.push(...buffer);

  return { code, prose };
};

const unwrapMarker = (line: string): string =>
  BLOCKQUOTE.exec(line)?.[1] ?? LIST_ITEM.exec(line)?.[1] ?? line.trim();

const startsOwnChunk = (line: string): boolean =>
  LIST_ITEM.test(line) || TABLE_ROW.test(line);

/**
 * A markdown sheet becomes a heap of chunks. The file itself ends here: what
 * lives on is the text, in no particular order.
 */
export const chunkMarkdown = (markdown: string): string[] => {
  const lines = markdown
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n");
  const { code, prose } = separateCode(lines.slice(skipFrontMatter(lines)));

  const chunks: string[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length > 0) {
      chunks.push(
        ...splitIntoSentences(stripInlineMarkup(paragraph.join(" "))),
      );
      paragraph = [];
    }
  };

  for (const line of prose) {
    if (line.trim() === "" || THEMATIC_BREAK.test(line)) {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      chunks.push(...splitIntoSentences(stripInlineMarkup(heading[1] ?? "")));
      continue;
    }

    if (TABLE_DELIMITER.test(line) && TABLE_ROW.test(line)) {
      flush();
      continue;
    }

    if (startsOwnChunk(line)) {
      flush();
      const text = TABLE_ROW.test(line)
        ? tableRowToText(line)
        : stripInlineMarkup(unwrapMarker(line));
      chunks.push(...splitIntoSentences(text));
      continue;
    }

    paragraph.push(unwrapMarker(line));
  }

  flush();

  return [...chunks, ...code];
};
