import type { WordCount } from "@/types/universe";

/**
 * Narrows the word list by what is typed, on the written form as well as the
 * stem: "audit" brings up "auditor", and so does "ditor".
 */
export const filterWords = (
  words: WordCount[],
  fragment: string,
): WordCount[] => {
  const wanted = fragment.trim().toLowerCase();
  if (wanted === "") {
    return words;
  }

  return words.filter(
    (word) =>
      word.label.toLowerCase().includes(wanted) || word.stem.includes(wanted),
  );
};
