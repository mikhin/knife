import type { SourceFormat } from "@/types/source-format";

const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdown", ".mkd"];

export const detectSourceFormat = (fileName: string): SourceFormat => {
  const lowered = fileName.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => lowered.endsWith(extension))
    ? "markdown"
    : "text";
};
