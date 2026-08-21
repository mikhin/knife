import type { SourceFormat } from "@/types/source-format";

/**
 * A file says what it is by its extension; pasted text has to be read. These
 * are the marks that only markdown makes — a hash that starts a heading, a
 * fence, a table delimiter, a link, a list item. Prose with a stray "#" in
 * the middle of a line stays prose.
 */
const MARKDOWN_MARKS = [
  /^\s{0,3}#{1,6}\s+\S/m,
  /^\s*(```|~~~)/m,
  /^[\s|:-]*\|[\s|:-]*-{2,}[\s|:-]*$/m,
  /^\s*(?:[-*+]|\d+[.)])\s+\S/m,
  /\[[^\]]+\]\([^)]+\)/,
  /\*\*[^*]+\*\*/,
];

export const detectPastedFormat = (text: string): SourceFormat =>
  MARKDOWN_MARKS.some((mark) => mark.test(text)) ? "markdown" : "text";
