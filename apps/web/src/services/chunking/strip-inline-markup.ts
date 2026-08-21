const REPLACEMENTS: Array<[RegExp, string]> = [
  [/<!--[\s\S]*?-->/g, " "],
  // Template shortcodes are the site generator talking, not the author.
  [/\{%[\s\S]*?%\}/g, " "],
  [/\{\{[\s\S]*?\}\}/g, " "],
  [/!\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/\[([^\]]*)\]\[[^\]]*\]/g, "$1"],
  [/`{1,3}([^`]*)`{1,3}/g, "$1"],
  [/<\/?[a-zA-Z][^>]*>/g, " "],
  [/(\*\*\*|___)(.*?)\1/g, "$2"],
  [/(\*\*|__)(.*?)\1/g, "$2"],
  [/(\*|_)(.*?)\1/g, "$2"],
  [/~~(.*?)~~/g, "$1"],
  [/\s+/g, " "],
];

/** Leaves only what a reader sees: emphasis, links and tags carry no words. */
export const stripInlineMarkup = (text: string): string =>
  REPLACEMENTS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  ).trim();
