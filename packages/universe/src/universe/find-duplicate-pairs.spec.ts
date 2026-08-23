import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "./build-universe-index";
import { findDuplicatePairs } from "./find-duplicate-pairs";
import type { Chunk } from "@knife/contract";

const chunk = (id: string, text: string, createdAt: string): Chunk => ({
  createdAt,
  id,
  projectId: "universe",
  text,
});

const LAST_YEAR = "2025-03-14T10:00:00.000Z";
const TODAY = "2026-08-21T10:00:00.000Z";

const background = (): Chunk[] => [
  chunk("b1", "Housekeeping restocks the minibar on arrival days.", LAST_YEAR),
  chunk("b2", "The forecast drives the quota lookup per position.", LAST_YEAR),
  chunk("b3", "Payroll exports leave on the first working day.", TODAY),
  chunk(
    "b4",
    "A pinned pattern materialises when the week is published.",
    TODAY,
  ),
  chunk("b5", "Occupancy is rooms sold divided by total rooms.", LAST_YEAR),
  chunk("b6", "Corporate access bypasses every property scope.", TODAY),
];

describe("findDuplicatePairs", () => {
  it("pairs two chunks that say the same thing in different words", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk(
        "old",
        "The night auditor must close the shift report before midnight.",
        LAST_YEAR,
      ),
      chunk(
        "new",
        "Before midnight the night auditor closes the shift report.",
        TODAY,
      ),
    ]);

    const report = findDuplicatePairs(index);
    const pair = report.pairs.find(
      (candidate) =>
        candidate.firstId === "old" || candidate.secondId === "old",
    );

    expect(pair).toBeDefined();
    expect([pair?.firstId, pair?.secondId].toSorted()).toEqual(["new", "old"]);
    expect(pair?.similarity).toBeGreaterThan(0.8);
  });

  it("names the words the two chunks share", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("old", "The night auditor closes the shift report.", LAST_YEAR),
      chunk("new", "A shift report is closed by the night auditor.", TODAY),
    ]);

    const [pair] = findDuplicatePairs(index).pairs;

    expect(pair?.sharedWords).toEqual(
      expect.arrayContaining(["auditor", "night", "report", "shift"]),
    );
  });

  it("sees a duplicate between a table row and a paragraph", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk(
        "paragraph",
        "The night auditor closes the shift report before midnight.",
        LAST_YEAR,
      ),
      chunk(
        "row",
        "Night auditor — closes the shift report before midnight",
        TODAY,
      ),
    ]);

    const [pair] = findDuplicatePairs(index).pairs;

    expect([pair?.firstId, pair?.secondId].toSorted()).toEqual([
      "paragraph",
      "row",
    ]);
  });

  it("leaves only the close pair when the threshold is raised", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("a", "The night auditor closes the shift report.", LAST_YEAR),
      chunk("b", "The night auditor closes the shift report.", TODAY),
      chunk("c", "The auditor files a report about the night.", TODAY),
    ]);

    const { pairs } = findDuplicatePairs(index);
    const strict = pairs.filter((pair) => pair.similarity >= 0.95);

    expect(pairs.length).toBeGreaterThan(strict.length);
    expect(
      strict.map((pair) => [pair.firstId, pair.secondId].toSorted()),
    ).toEqual([["a", "b"]]);
  });

  it("returns pairs strongest first", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("a", "The night auditor closes the shift report.", LAST_YEAR),
      chunk("b", "The night auditor closes the shift report.", TODAY),
      chunk("c", "The auditor writes a shift note.", TODAY),
    ]);

    const similarities = findDuplicatePairs(index).pairs.map(
      (pair) => pair.similarity,
    );

    expect(similarities).toEqual([...similarities].toSorted((a, b) => b - a));
  });

  it("does not call two limits the same requirement", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("short", "Data retention is 30 days.", LAST_YEAR),
      chunk("long", "Data retention is 90 days.", TODAY),
    ]);

    const [pair] = findDuplicatePairs(index).pairs;

    expect(pair?.similarity ?? 0).toBeLessThan(0.95);
  });

  it("does not call a rule and its negation the same requirement", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("yes", "The manager approves the overtime request.", LAST_YEAR),
      chunk("no", "The manager does not approve the overtime request.", TODAY),
    ]);

    const [pair] = findDuplicatePairs(index).pairs;

    expect(pair?.similarity ?? 0).toBeLessThan(0.95);
  });

  it("does not call a rule and its contracted negation the same", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("yes", "The manager approves the overtime request.", LAST_YEAR),
      chunk("no", "The manager doesn't approve the overtime request.", TODAY),
    ]);

    const [pair] = findDuplicatePairs(index).pairs;

    expect(pair?.similarity ?? 0).toBeLessThan(0.95);
  });

  it("marks the pair where one denies what the other asserts", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("yes", "The manager approves the overtime request.", LAST_YEAR),
      chunk("no", "The manager does not approve the overtime request.", TODAY),
    ]);

    const [pair] = findDuplicatePairs(index).pairs;

    expect(pair?.polarityDiffers).toBe(true);
  });

  it("leaves an ordinary duplicate unmarked", () => {
    const index = buildUniverseIndex([
      ...background(),
      chunk("a", "The night auditor closes the shift report.", LAST_YEAR),
      chunk("b", "A shift report is closed by the night auditor.", TODAY),
    ]);

    const [pair] = findDuplicatePairs(index).pairs;

    expect(pair?.polarityDiffers).toBe(false);
  });

  it("keeps unrelated chunks apart", () => {
    const index = buildUniverseIndex(background());

    expect(findDuplicatePairs(index).pairs).toEqual([]);
  });
});
