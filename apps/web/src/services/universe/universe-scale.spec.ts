import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "@/services/universe/build-universe-index";
import { buildWordGraph } from "@/services/universe/build-word-graph";
import { detectWater } from "@/services/universe/detect-water";
import { findDanglingChunks } from "@/services/universe/find-dangling-chunks";
import { findDuplicatePairs } from "@/services/universe/find-duplicate-pairs";
import type { Chunk } from "@knife/contract";

const UNIVERSE_SIZE = 30000;
const BUDGET_MS = 15000;

const VOCABULARY = [
  "shift",
  "auditor",
  "payroll",
  "quota",
  "occupancy",
  "forecast",
  "roster",
  "department",
  "position",
  "property",
  "housekeeping",
  "arrival",
  "departure",
  "revenue",
  "snapshot",
  "draft",
  "publish",
  "invite",
  "membership",
  "scope",
  "break",
  "overtime",
  "approval",
  "threshold",
  "export",
  "import",
  "vendor",
  "contract",
  "tenant",
  "corporate",
  "manager",
  "employee",
  "schedule",
  "minibar",
  "orangery",
  "peacock",
  "lantern",
  "corridor",
  "inventory",
  "laundry",
  "banquet",
  "concierge",
  "valet",
  "turnover",
  "linen",
  "amenity",
];

/** Deterministic, so a slow run means slower code and not a different text. */
const nextSeed = (seed: number): number =>
  (seed * 1103515245 + 12345) % 2147483648;

const generateUniverse = (size: number): Chunk[] => {
  const chunks: Chunk[] = [];
  let seed = 42;
  let previous = "";

  for (let position = 0; position < size; position += 1) {
    seed = nextSeed(seed);
    const length = 8 + (seed % 9);
    const words: string[] = [];

    for (let word = 0; word < length; word += 1) {
      seed = nextSeed(seed);
      words.push(VOCABULARY[seed % VOCABULARY.length] ?? "shift");
    }

    // Every fiftieth chunk repeats the one before it, so the run has something
    // real to find rather than measuring an empty result.
    const text =
      position % 50 === 0 && previous
        ? previous
        : `The ${words.join(" ")} is approved by the manager.`;
    previous = text;

    chunks.push({
      createdAt: new Date(
        Date.UTC(2020, 0, 1 + (position % 2000)),
      ).toISOString(),
      id: `chunk-${position}`,
      projectId: "universe",
      text,
    });
  }

  return chunks;
};

describe("a universe of tens of thousands of chunks", () => {
  it("shows duplicates, water and the graph without minutes of waiting", () => {
    const chunks = generateUniverse(UNIVERSE_SIZE);

    const started = performance.now();
    const index = buildUniverseIndex(chunks);
    const duplicates = findDuplicatePairs(index);
    const water = detectWater(index);
    const dangling = findDanglingChunks(index);
    const graph = buildWordGraph(index);
    const elapsed = performance.now() - started;

    expect(index.size).toBe(UNIVERSE_SIZE);
    expect(duplicates.pairs.length).toBeGreaterThan(0);
    expect(water.length).toBeGreaterThan(0);
    expect(dangling).toEqual([]);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});
