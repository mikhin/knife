import type { SourceFormat } from "@knife/universe";

const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdown", ".mkd"];

export const detectSourceFormat = (fileName: string): SourceFormat => {
  const lowered = fileName.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => lowered.endsWith(extension))
    ? "markdown"
    : "text";
};
