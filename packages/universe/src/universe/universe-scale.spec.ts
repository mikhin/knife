import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "./build-universe-index";
import { listWords } from "./list-words";
import { findDanglingChunks } from "./find-dangling-chunks";
import { findDuplicatePairs } from "./find-duplicate-pairs";
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

/** Один чанк, который ни с чем не делит ни слова: висящие должны его найти. */
const LONELY = "Sundials rust quietly beneath unpruned wisteria.";

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
        : `The ${words.join(" ")} of week ${position % 400} is approved by the manager.`;
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

  chunks.push({
    createdAt: new Date(Date.UTC(2020, 0, 1)).toISOString(),
    id: "lonely",
    projectId: "universe",
    text: LONELY,
  });

  return chunks;
};

describe("a universe of tens of thousands of chunks", () => {
  // Единственный тест, которому позволено быть долгим: он про то, сколько
  // времени занимает вселенная целиком.
  it(
    "shows duplicates, words and hanging chunks without minutes of waiting",
    () => {
      const chunks = generateUniverse(UNIVERSE_SIZE);

      const started = performance.now();
      const index = buildUniverseIndex(chunks);
      const duplicates = findDuplicatePairs(index);
      const dangling = findDanglingChunks(index);
      const words = listWords(index);
      const elapsed = performance.now() - started;

      expect(index.size).toBe(UNIVERSE_SIZE + 1);
      expect(duplicates.pairs.length).toBeGreaterThan(0);

      // Висящий здесь ровно один, и он подсажен намеренно.
      expect(dangling).toEqual(["lonely"]);

      expect(words.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(BUDGET_MS);
    },
    BUDGET_MS + 15000,
  );
});
