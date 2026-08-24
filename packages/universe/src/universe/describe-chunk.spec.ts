import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "./build-universe-index";
import { describeChunk } from "./describe-chunk";
import type { Chunk } from "@knife/contract";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

const universe = [
  chunk("a", "The night auditor closes the shift report."),
  chunk("b", "All shifts are approved by the manager."),
  chunk("c", "The manager keeps shifting the schedule."),
  chunk("d", "Payroll exports leave on Monday."),
];

describe("describeChunk", () => {
  it("names the words the chunk is made of", () => {
    const profile = describeChunk(buildUniverseIndex(universe), "b");

    expect(profile.words.map((word) => word.stem).toSorted()).toEqual([
      "approv",
      "manag",
      "shift",
    ]);
  });

  it("leaves out the service words the rest of the universe leaves out", () => {
    const profile = describeChunk(buildUniverseIndex(universe), "b");

    expect(profile.words.map((word) => word.stem)).not.toContain("the");
  });

  it("counts the other chunks holding the word, never this one", () => {
    const profile = describeChunk(buildUniverseIndex(universe), "b");
    const held = new Map(
      profile.words.map((word) => [word.stem, word.elsewhere]),
    );

    expect(held.get("shift")).toBe(2);
    expect(held.get("approv")).toBe(0);
  });

  it("puts the rarest words first", () => {
    const profile = describeChunk(buildUniverseIndex(universe), "b");

    expect(profile.words.map((word) => word.stem)).toEqual([
      "approv",
      "manag",
      "shift",
    ]);
  });

  it("gives every word a readable label", () => {
    const profile = describeChunk(buildUniverseIndex(universe), "c");

    expect(profile.words.map((word) => word.label)).toContain("manager");
  });

  it("says nothing about a chunk that is already gone", () => {
    const profile = describeChunk(buildUniverseIndex(universe), "gone");

    expect(profile).toEqual({ id: "gone", words: [] });
  });
});
