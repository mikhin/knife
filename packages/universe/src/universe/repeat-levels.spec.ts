import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "./build-universe-index";
import { findDuplicatePairs } from "./find-duplicate-pairs";
import { pairsAtLevel, REPEAT_LEVELS, repeatLevel } from "./repeat-levels";
import type { Chunk } from "@knife/contract";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

describe("repeat levels", () => {
  it("names every level it offers", () => {
    expect(REPEAT_LEVELS.map((level) => level.id)).toEqual([
      "almost",
      "close",
      "loose",
    ]);
  });

  it("orders levels from the strictest down", () => {
    const thresholds = REPEAT_LEVELS.map((level) => level.from);

    expect(thresholds).toEqual([...thresholds].toSorted((a, b) => b - a));
  });

  /**
   * The loosest level promises everything the calculation keeps. Were it to
   * sit below the floor, it would name a count of repeats nobody can reach.
   */
  it("stops where the calculation itself stops", () => {
    const report = findDuplicatePairs(buildUniverseIndex([]));

    expect(REPEAT_LEVELS.at(-1)?.from).toBe(report.similarityFloor);
  });

  it("refuses a level it does not have", () => {
    // @ts-expect-error the guard exists for callers arriving from outside TypeScript
    expect(() => repeatLevel("nearly")).toThrow("No such repeat level");
  });

  it("admits the pairs the level reaches and drops the rest", () => {
    const index = buildUniverseIndex([
      chunk("a", "A refund request must be submitted within 48 hours."),
      chunk("b", "Refund requests are submitted within 48 hours."),
      chunk("c", "The orangery peacocks are counted at dawn every Monday."),
      chunk("d", "Peacocks in the orangery wander off before payroll closes."),
    ]);
    const { pairs } = findDuplicatePairs(index);

    const almost = pairsAtLevel(pairs, repeatLevel("almost").from);
    const loose = pairsAtLevel(pairs, repeatLevel("loose").from);

    expect(almost.every((pair) => pair.similarity >= 0.9)).toBe(true);
    expect(loose.length).toBeGreaterThanOrEqual(almost.length);
  });
});
