import { stemWord } from "@/services/text/stem-word";
import { STOPWORDS } from "@/services/text/stopwords";
import type { Token } from "@/types/token";

/**
 * Numbers and version-like codes are words here. Requirements differ by their
 * limits more often than by their wording — "retention is 30 days" and "90
 * days" are not the same rule, and dropping the number made them identical.
 */
const WORD_PATTERN =
  /[\p{L}][\p{L}\p{N}]*(?:['’][\p{L}]+)*|\p{N}+(?:[.,]\p{N}+)*[\p{L}]*/gu;

/**
 * "n't" stays attached: stripping it turned "doesn't approve" into "does
 * approve" and made a rule identical to its own negation.
 */
const CLITICS = /(?:'s|'re|'ve|'ll|'d|'m)$/;

const bareForm = (surface: string): string => {
  const lowered = surface.toLowerCase().replaceAll("’", "'");
  const withoutClitic = lowered.replace(CLITICS, "");
  return (withoutClitic || lowered).replaceAll("'", "");
};

const isNumeric = (bare: string): boolean => /^\p{N}/u.test(bare);

/**
 * Keeps the offsets of every word: that is what lets a click on a node
 * highlight the word inside the chunk instead of just listing the chunk.
 */
export const tokenizeText = (text: string): Token[] => {
  const tokens: Token[] = [];

  for (const match of text.matchAll(WORD_PATTERN)) {
    const surface = match[0];
    const bare = bareForm(surface);
    if (bare.length === 0 || (bare.length < 2 && !isNumeric(bare))) {
      continue;
    }

    const start = match.index;
    tokens.push({
      end: start + surface.length,
      isStop: STOPWORDS.has(bare),
      start,
      // A number stems to itself; the Snowball rules have nothing to say here.
      stem: isNumeric(bare) ? bare : stemWord(bare),
      surface,
    });
  }

  return tokens;
};
