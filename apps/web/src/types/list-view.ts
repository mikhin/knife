export const CHUNK_ORDERS = [
  "oldest",
  "newest",
  "longest",
  "problems",
] as const;

export const WORD_ORDERS = ["common", "rare", "alphabetical"] as const;

export const CHUNK_FILTERS = [
  "all",
  "duplicates",
  "noted",
  "dangling",
] as const;

export type ChunkOrder = (typeof CHUNK_ORDERS)[number];

export type WordOrder = (typeof WORD_ORDERS)[number];

export type ChunkFilter = (typeof CHUNK_FILTERS)[number];
