import { describe, expect, it } from "vitest";
import { filterChunks } from "@/services/lists/filter-chunks";
import type { Chunk } from "@knife/contract";

const chunk = (id: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text: id,
});

const universe = [chunk("one"), chunk("two"), chunk("three")];
const marks = {
  dangling: new Set<string>(),
  duplicates: new Set(["one", "two"]),
  noted: new Set(["three"]),
};

const ids = (kept: Chunk[]): string[] => kept.map((one) => one.id);

describe("filterChunks", () => {
  it("keeps everything when nothing is asked for", () => {
    expect(ids(filterChunks(universe, "all", marks))).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("keeps only what the chosen check flagged", () => {
    expect(ids(filterChunks(universe, "duplicates", marks))).toEqual([
      "one",
      "two",
    ]);
  });

  it("keeps only what the linters wrote on", () => {
    expect(ids(filterChunks(universe, "noted", marks))).toEqual(["three"]);
  });

  it("says so plainly when a check flagged nothing", () => {
    expect(filterChunks(universe, "dangling", marks)).toEqual([]);
  });
});
