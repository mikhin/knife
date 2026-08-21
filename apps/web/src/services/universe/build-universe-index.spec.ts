import type { Chunk } from "@knife/contract";
import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "@/services/universe/build-universe-index";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

const universe = [
  chunk("a", "The night auditor closes the shift report."),
  chunk("b", "All shifts are approved by the manager."),
  chunk("c", "Payroll exports leave on Monday."),
];

describe("buildUniverseIndex", () => {
  it("counts how many chunks a word appears in, not how often", () => {
    const index = buildUniverseIndex([
      ...universe,
      chunk("d", "A shift is a shift is a shift."),
    ]);

    expect(index.documentFrequency.get("shift")).toBe(3);
  });

  it("points a word at every chunk that holds it", () => {
    const index = buildUniverseIndex(universe);

    const holders = (index.postings.get("shift") ?? []).map(
      (position) => index.chunks[position]?.id,
    );

    expect(holders.toSorted()).toEqual(["a", "b"]);
  });

  it("gives a rarer word more weight than a common one", () => {
    const index = buildUniverseIndex(universe);

    expect(index.idf.get("payrol") ?? 0).toBeGreaterThan(
      index.idf.get("shift") ?? 0,
    );
  });

  it("normalises a chunk so length alone cannot make it similar", () => {
    const index = buildUniverseIndex(universe);

    for (const indexed of index.chunks) {
      const length = Math.sqrt(
        [...indexed.weights.values()].reduce(
          (total, weight) => total + weight * weight,
          0,
        ),
      );
      expect(length).toBeCloseTo(1, 6);
    }
  });

  it("labels a stem with the form written most often", () => {
    const index = buildUniverseIndex([
      chunk("a", "Shifts are approved."),
      chunk("b", "Shifts are published."),
      chunk("c", "A shift is approved."),
    ]);

    expect(index.surfaceForms.get("shift")).toBe("shifts");
  });

  it("separates the substance of a chunk from its service words", () => {
    const index = buildUniverseIndex([
      chunk("a", "The night auditor closes the shift report."),
    ]);
    const [indexed] = index.chunks;

    expect(indexed?.wordCount).toBe(7);
    expect(indexed?.contentCount).toBe(5);
    expect(indexed?.stopRatio).toBeCloseTo(2 / 7, 6);
    expect(indexed?.stems.toSorted()).toEqual([
      "auditor",
      "close",
      "night",
      "report",
      "shift",
    ]);
  });

  it("finds a chunk by id", () => {
    const index = buildUniverseIndex(universe);

    expect(index.byId.get("c")?.text).toBe("Payroll exports leave on Monday.");
  });

  it("has nothing to say about an empty universe", () => {
    const index = buildUniverseIndex([]);

    expect(index.size).toBe(0);
    expect(index.documentFrequency.size).toBe(0);
  });

  it("survives a chunk with no words in it", () => {
    const index = buildUniverseIndex([chunk("a", "--- ... |")]);
    const [indexed] = index.chunks;

    expect(indexed?.stems).toEqual([]);
    expect(indexed?.stopRatio).toBe(0);
  });
});
