import { chunkMarkdown } from "@/services/chunking/chunk-markdown";
import { chunkPlainText } from "@/services/chunking/chunk-plain-text";
import type { SourceFormat } from "@/types/source-format";

export const chunkSource = (text: string, format: SourceFormat): string[] =>
  format === "markdown" ? chunkMarkdown(text) : chunkPlainText(text);
