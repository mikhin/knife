import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "./build-universe-index";
import { describeWord } from "./describe-word";
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

describe("describeWord", () => {
  it("lists every chunk the word appears in", () => {
    const profile = describeWord(buildUniverseIndex(universe), "shift");

    expect(
      profile.occurrences.map((entry) => entry.chunkId).toSorted(),
    ).toEqual(["a", "b", "c"]);
  });

  it("marks where the word sits inside the text", () => {
    const index = buildUniverseIndex(universe);
    const profile = describeWord(index, "shift");
    const occurrence = profile.occurrences.find(
      (entry) => entry.chunkId === "c",
    );
    const text = index.byId.get("c")?.text ?? "";
    const [span] = occurrence?.spans ?? [];

    expect(text.slice(span?.start ?? 0, span?.end ?? 0)).toBe("shifting");
  });

  it("shows the words it travels with", () => {
    const profile = describeWord(buildUniverseIndex(universe), "shift");

    expect(profile.companions.map((companion) => companion.stem)).toEqual(
      expect.arrayContaining(["manag"]),
    );
    expect(profile.companions.map((companion) => companion.stem)).not.toContain(
      "payrol",
    );
  });

  it("gives the word a readable label", () => {
    const profile = describeWord(buildUniverseIndex(universe), "manag");

    expect(profile.label).toBe("manager");
  });
});
