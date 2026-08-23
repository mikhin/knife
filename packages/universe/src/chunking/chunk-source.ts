import { chunkMarkdown } from "./chunk-markdown";
import { chunkPlainText } from "./chunk-plain-text";
import type { SourceFormat } from "../types/source-format";

export const chunkSource = (text: string, format: SourceFormat): string[] =>
  format === "markdown" ? chunkMarkdown(text) : chunkPlainText(text);
