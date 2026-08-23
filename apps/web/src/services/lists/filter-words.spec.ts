import { describe, expect, it } from "vitest";
import { filterWords } from "@/services/lists/filter-words";
import type { WordCount } from "@knife/universe";

const word = (label: string, stem: string): WordCount => ({
  chunkCount: 1,
  label,
  stem,
});

const words = [
  word("auditor", "auditor"),
  word("shifts", "shift"),
  word("payroll", "payrol"),
];

describe("filterWords", () => {
  it("keeps the whole list when nothing is typed", () => {
    expect(filterWords(words, "   ")).toEqual(words);
  });

  it("finds a word by its beginning", () => {
    expect(filterWords(words, "aud").map((found) => found.label)).toEqual([
      "auditor",
    ]);
  });

  it("finds a word by a fragment inside it", () => {
    expect(filterWords(words, "ditor").map((found) => found.label)).toEqual([
      "auditor",
    ]);
  });

  it("finds a word written differently from its stem", () => {
    expect(filterWords(words, "shifts").map((found) => found.stem)).toEqual([
      "shift",
    ]);
  });

  it("ignores the case that was typed", () => {
    expect(filterWords(words, "AUDIT").map((found) => found.label)).toEqual([
      "auditor",
    ]);
  });

  it("comes back empty when nothing matches", () => {
    expect(filterWords(words, "zzz")).toEqual([]);
  });
});
