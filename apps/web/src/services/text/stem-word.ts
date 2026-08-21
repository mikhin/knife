import { newStemmer } from "snowball-stemmers";

const stemmer = newStemmer("english");

/**
 * The same few hundred forms repeat across a whole universe, and stemming
 * them again every time cost 87% of indexing a 30 000-chunk project.
 */
const known = new Map<string, string>();

/**
 * The single place that decides what counts as one word: "shift" and "shifts"
 * stem the same, so they are one node on the graph and one hit in search.
 */
export const stemWord = (word: string): string => {
  const cached = known.get(word);
  if (cached !== undefined) {
    return cached;
  }

  const stem = stemmer.stem(word);
  known.set(word, stem);
  return stem;
};
