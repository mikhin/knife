import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "./build-universe-index";
import { searchUniverse } from "./search-universe";
import type { Chunk } from "@knife/contract";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

const universe = [
  chunk("one", "A shift starts at eight."),
  chunk("many", "All shifts are approved by the manager."),
  chunk("verb", "The manager is shifting the schedule again."),
  chunk("other", "Payroll exports leave on Monday."),
];

describe("searchUniverse", () => {
  it("finds every form of the word that was typed", () => {
    const hits = searchUniverse(buildUniverseIndex(universe), "shift");

    expect(hits.map((hit) => hit.chunkId).toSorted()).toEqual([
      "many",
      "one",
      "verb",
    ]);
  });

  it("points at the word inside the chunk, not just at the chunk", () => {
    const index = buildUniverseIndex(universe);
    const hit = searchUniverse(index, "shift").find(
      (candidate) => candidate.chunkId === "many",
    );
    const text = index.byId.get("many")?.text ?? "";
    const [span] = hit?.spans ?? [];

    expect(text.slice(span?.start ?? 0, span?.end ?? 0)).toBe("shifts");
  });

  it("keeps only chunks that hold every word of the query", () => {
    const hits = searchUniverse(
      buildUniverseIndex(universe),
      "manager schedule",
    );

    expect(hits.map((hit) => hit.chunkId)).toEqual(["verb"]);
  });

  it("ignores service words typed alongside the term", () => {
    const hits = searchUniverse(buildUniverseIndex(universe), "the shift");

    expect(hits.map((hit) => hit.chunkId).toSorted()).toEqual([
      "many",
      "one",
      "verb",
    ]);
  });

  it("finds a word by a fragment of it", () => {
    const hits = searchUniverse(buildUniverseIndex(universe), "shif");

    expect(hits.map((hit) => hit.chunkId).toSorted()).toEqual([
      "many",
      "one",
      "verb",
    ]);
  });

  it("highlights what the fragment matched", () => {
    const index = buildUniverseIndex(universe);
    const hit = searchUniverse(index, "shif").find(
      (candidate) => candidate.chunkId === "many",
    );
    const text = index.byId.get("many")?.text ?? "";
    const [span] = hit?.spans ?? [];

    expect(text.slice(span?.start ?? 0, span?.end ?? 0)).toBe("shifts");
  });

  it("finds nothing for a fragment no word contains", () => {
    expect(searchUniverse(buildUniverseIndex(universe), "zzz")).toEqual([]);
  });

  it("looks for a service word letter by letter, since it is all there is", () => {
    const hits = searchUniverse(buildUniverseIndex(universe), "on");

    // "on" the preposition and "Monday" that carries the same letters
    expect(hits.map((hit) => hit.chunkId)).toEqual(["other"]);
    expect(hits[0]?.spans).toHaveLength(2);
  });

  it("still wants every service word of the query present", () => {
    expect(searchUniverse(buildUniverseIndex(universe), "the and")).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchUniverse(buildUniverseIndex(universe), "   ")).toEqual([]);
  });
});
