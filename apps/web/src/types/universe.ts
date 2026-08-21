import type { Token } from "@/types/token";

export type IndexedChunk = {
  /** Words that are not service words: the substance the checks weigh. */
  contentCount: number;
  createdAt: string;
  id: string;
  /** Unique content stems, the identity of the chunk for every check below. */
  stems: string[];
  stopRatio: number;
  text: string;
  tokens: Token[];
  weights: Map<string, number>;
  wordCount: number;
};

export type UniverseIndex = {
  byId: Map<string, IndexedChunk>;
  chunks: IndexedChunk[];
  documentFrequency: Map<string, number>;
  idf: Map<string, number>;
  /** stem -> positions in `chunks`, the only way a pair is ever considered. */
  postings: Map<string, number[]>;
  size: number;
  surfaceForms: Map<string, string>;
};

export type DuplicatePair = {
  firstId: string;
  /** One of the two denies what the other asserts — never a safe deletion. */
  polarityDiffers: boolean;
  secondId: string;
  /** Words present in both, strongest contribution first. */
  sharedWords: string[];
  similarity: number;
};

export type DuplicateReport = {
  pairs: DuplicatePair[];
  similarityFloor: number;
  /** Pairs above the floor that were cut to keep the graph responsive. */
  truncatedPairs: number;
};

export type WaterRule =
  | "no-rare-terms"
  | "repeats-itself"
  | "stop-word-flood"
  | "too-few-terms";

export type WaterFinding = {
  evidence: string;
  explanation: string;
  rule: WaterRule;
};

export type WaterVerdict = {
  chunkId: string;
  findings: WaterFinding[];
};

export type WordCount = {
  chunkCount: number;
  label: string;
  stem: string;
};

export type SearchHit = {
  chunkId: string;
  spans: Array<{ end: number; start: number }>;
};

export type WordOccurrence = {
  chunkId: string;
  spans: Array<{ end: number; start: number }>;
};

export type WordProfile = {
  companions: WordCount[];
  label: string;
  occurrences: WordOccurrence[];
  stem: string;
};
