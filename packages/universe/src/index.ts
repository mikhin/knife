/**
 * The universe as a calculation: chunks in, findings out. Nothing here knows
 * about a screen or a server, so the browser worker and an agent on the other
 * side of MCP reach the same verdict from the same code — two copies of this
 * would drift, and the drift would only show as an argument about a repeat.
 */

export { chunkSource } from "./chunking/chunk-source";
export { detectPastedFormat } from "./chunking/detect-pasted-format";
export type { SourceFormat } from "./types/source-format";
export type { Token } from "./types/token";
export type {
  ChunkProfile,
  ChunkWord,
  DuplicatePair,
  DuplicateReport,
  IndexedChunk,
  SearchHit,
  UniverseIndex,
  WordCount,
  WordOccurrence,
  WordProfile,
} from "./types/universe";
export { buildUniverseIndex } from "./universe/build-universe-index";
export { describeChunk } from "./universe/describe-chunk";
export { describeWord } from "./universe/describe-word";
export { findDanglingChunks } from "./universe/find-dangling-chunks";
export { findDuplicatePairs } from "./universe/find-duplicate-pairs";
export { listWords } from "./universe/list-words";
export {
  pairsAtLevel,
  REPEAT_LEVELS,
  repeatLevel,
} from "./universe/repeat-levels";
export type { RepeatLevel, RepeatLevelId } from "./universe/repeat-levels";
export { searchUniverse } from "./universe/search-universe";
export { sharedWordSpans } from "./universe/shared-word-spans";
/** The same cut into words the index was built with: a caller that asked
 * about "refunds" has to arrive at the stem the universe holds. */
export { tokenizeText } from "./text/tokenize-text";
