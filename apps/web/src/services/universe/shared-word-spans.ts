import { stemWord } from "@/services/text/stem-word";
import { tokenizeText } from "@/services/text/tokenize-text";

/**
 * Where in a chunk the words it shares with another one are written. A pair
 * carries those words the way the universe usually spells them, which is not
 * always how this chunk does, so they are matched by stem — and the reader
 * sees what the percentage is made of instead of hunting for it.
 */
export const sharedWordSpans = (
  text: string,
  words: string[],
): Array<{ end: number; start: number }> => {
  const wanted = new Set(words.map((word) => stemWord(word.toLowerCase())));

  return tokenizeText(text)
    .filter((token) => wanted.has(token.stem))
    .map((token) => ({ end: token.end, start: token.start }));
};
