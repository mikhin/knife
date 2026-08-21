import type { Chunk } from "@knife/contract";
import type {
  DuplicateReport,
  SearchHit,
  WaterVerdict,
  WordCount,
  WordProfile,
} from "@/types/universe";

/**
 * Everything the checks found, computed from the chunks alone and living only
 * here — reopening the project runs it again rather than reading it back.
 */
export type UniverseReport = {
  dangling: string[];
  duplicates: DuplicateReport;
  water: WaterVerdict[];
  words: WordCount[];
};

export type WorkerRequest =
  | { chunks: Chunk[]; type: "analyse" }
  | { query: string; type: "search" }
  | { stem: string; type: "word" };

export type WorkerResponse =
  | { hits: SearchHit[]; query: string; type: "search" }
  | { profile: WordProfile; type: "word" }
  | { report: UniverseReport; type: "analysed" };
