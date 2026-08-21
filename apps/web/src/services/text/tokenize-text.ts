import { stemWord } from "@/services/text/stem-word";
import { STOPWORDS } from "@/services/text/stopwords";
import type { Token } from "@/types/token";

const WORD_PATTERN =
  /[\p{L}][\p{L}\p{N}]*(?:['’][\p{L}]+)*|\p{N}+[\p{L}][\p{L}\p{N}]*/gu;
const CLITICS = /(?:n't|'s|'re|'ve|'ll|'d|'m)$/;

const bareForm = (surface: string): string => {
  const lowered = surface.toLowerCase().replaceAll("’", "'");
  const withoutClitic = lowered.replace(CLITICS, "");
  return (withoutClitic || lowered).replaceAll("'", "");
};

/**
 * Keeps the offsets of every word: that is what lets a click on a node
 * highlight the word inside the chunk instead of just listing the chunk.
 */
export const tokenizeText = (text: string): Token[] => {
  const tokens: Token[] = [];

  for (const match of text.matchAll(WORD_PATTERN)) {
    const surface = match[0];
    const bare = bareForm(surface);
    if (bare.length < 2) {
      continue;
    }

    const start = match.index;
    tokens.push({
      end: start + surface.length,
      isStop: STOPWORDS.has(bare),
      start,
      stem: stemWord(bare),
      surface,
    });
  }

  return tokens;
};
