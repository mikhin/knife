import { describe, expect, it } from "vitest";
import { sortWords } from "@/services/lists/sort-words";
import type { WordCount } from "@knife/universe";

const word = (label: string, chunkCount: number): WordCount => ({
  chunkCount,
  label,
  stem: label,
});

const words = [word("shift", 5), word("auditor", 12), word("linen", 5)];

describe("sortWords", () => {
  it("puts the most common word first", () => {
    expect(sortWords(words, "common").map((found) => found.label)).toEqual([
      "auditor",
      "linen",
      "shift",
    ]);
  });

  it("puts the rarest word first", () => {
    expect(sortWords(words, "rare").map((found) => found.label)).toEqual([
      "linen",
      "shift",
      "auditor",
    ]);
  });

  it("sorts by spelling when asked", () => {
    expect(
      sortWords(words, "alphabetical").map((found) => found.label),
    ).toEqual(["auditor", "linen", "shift"]);
  });

  it("keeps words of equal weight in a settled order", () => {
    expect(
      sortWords(words, "common")
        .slice(1)
        .map((found) => found.label),
    ).toEqual(["linen", "shift"]);
  });
});
