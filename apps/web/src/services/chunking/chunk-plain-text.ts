import { splitIntoSentences } from "@/services/chunking/split-into-sentences";

/**
 * Plain text gets no markdown reading at all: a line starting with a dash is
 * a dash, and a hash is a hash. Only blank lines separate paragraphs.
 */
export const chunkPlainText = (text: string): string[] =>
  text
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split(/\n\s*\n/)
    .flatMap((paragraph) =>
      splitIntoSentences(paragraph.replace(/\s+/g, " ").trim()),
    );
