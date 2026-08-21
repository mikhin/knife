import { newStemmer } from "snowball-stemmers";

const stemmer = newStemmer("english");

/**
 * The single place that decides what counts as one word: "shift" and "shifts"
 * stem the same, so they are one node on the graph and one hit in search.
 */
export const stemWord = (word: string): string => stemmer.stem(word);
