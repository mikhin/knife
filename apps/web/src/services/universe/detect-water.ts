import type {
  IndexedChunk,
  UniverseIndex,
  WaterFinding,
  WaterVerdict,
} from "@/types/universe";

const STOP_WORD_SHARE = 0.6;
const MIN_WORDS_FOR_FLOOD = 6;
const MIN_CONTENT_TERMS = 3;
const COMMON_EVERYWHERE_SHARE = 0.25;
const MIN_UNIVERSE_FOR_RARITY = 20;
const MIN_TERMS_FOR_REPETITION = 8;
const MIN_LEXICAL_DENSITY = 0.5;

type Rule = (
  chunk: IndexedChunk,
  index: UniverseIndex,
) => undefined | WaterFinding;

const stopWordFlood: Rule = (chunk) => {
  if (
    chunk.wordCount < MIN_WORDS_FOR_FLOOD ||
    chunk.stopRatio < STOP_WORD_SHARE
  ) {
    return undefined;
  }
  const stopWords = Math.round(chunk.stopRatio * chunk.wordCount);
  return {
    evidence: `${stopWords} of ${chunk.wordCount} words are service words`,
    explanation: "Almost nothing here is a term — the sentence is scaffolding.",
    rule: "stop-word-flood",
  };
};

const tooFewTerms: Rule = (chunk) => {
  if (chunk.stems.length >= MIN_CONTENT_TERMS) {
    return undefined;
  }
  return {
    evidence: `${chunk.stems.length} word(s) carry meaning`,
    explanation: "Too little substance to connect this to anything.",
    rule: "too-few-terms",
  };
};

const noRareTerms: Rule = (chunk, index) => {
  if (index.size < MIN_UNIVERSE_FOR_RARITY || chunk.stems.length === 0) {
    return undefined;
  }

  const shares = chunk.stems.map(
    (stem) => (index.documentFrequency.get(stem) ?? 0) / index.size,
  );
  const rarest = Math.min(...shares);
  if (rarest < COMMON_EVERYWHERE_SHARE) {
    return undefined;
  }

  return {
    evidence: `every word here sits in ${Math.round(rarest * 100)}%+ of the universe`,
    explanation:
      "General words only — no term makes this chunk about anything.",
    rule: "no-rare-terms",
  };
};

const repeatsItself: Rule = (chunk) => {
  if (chunk.contentCount < MIN_TERMS_FOR_REPETITION) {
    return undefined;
  }
  const density = chunk.stems.length / chunk.contentCount;
  if (density >= MIN_LEXICAL_DENSITY) {
    return undefined;
  }
  return {
    evidence: `${chunk.stems.length} distinct terms across ${chunk.contentCount} meaningful words`,
    explanation: "The same few words go round in circles.",
    rule: "repeats-itself",
  };
};

const RULES: Rule[] = [stopWordFlood, tooFewTerms, noRareTerms, repeatsItself];

/**
 * Water is never hidden behind a score: every verdict names the rule that
 * fired and shows the numbers it fired on, because deleting stays my call.
 */
export const detectWater = (index: UniverseIndex): WaterVerdict[] =>
  index.chunks
    .map((chunk) => ({
      chunkId: chunk.id,
      findings: RULES.map((rule) => rule(chunk, index)).filter(
        (finding): finding is WaterFinding => finding !== undefined,
      ),
    }))
    .filter((verdict) => verdict.findings.length > 0);
