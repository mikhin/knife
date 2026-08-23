import type { Chunk } from "@knife/contract";
import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "./build-universe-index";
import { listWords } from "./list-words";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

describe("listWords", () => {
  it("puts every form of a word on one row", () => {
    const words = listWords(
      buildUniverseIndex([
        chunk("a", "A shift starts at eight."),
        chunk("b", "All shifts are approved by the manager."),
        chunk("c", "The manager keeps shifting the schedule."),
      ]),
    );

    const shift = words.filter((word) => word.stem === "shift");

    expect(shift).toHaveLength(1);
    expect(shift[0]?.chunkCount).toBe(3);
  });

  it("labels a word with the form written most often", () => {
    const words = listWords(
      buildUniverseIndex([
        chunk("a", "Shifts are approved."),
        chunk("b", "Shifts are published."),
        chunk("c", "A shift is approved."),
      ]),
    );

    expect(words.find((word) => word.stem === "shift")?.label).toBe("shifts");
  });

  it("counts chunks, not repetitions inside one", () => {
    const words = listWords(
      buildUniverseIndex([chunk("a", "A shift is a shift is a shift.")]),
    );

    expect(words.find((word) => word.stem === "shift")?.chunkCount).toBe(1);
  });

  it("puts the most common word first", () => {
    const words = listWords(
      buildUniverseIndex([
        chunk("a", "The auditor closes the shift report."),
        chunk("b", "The auditor files a report."),
        chunk("c", "Payroll leaves on Monday."),
      ]),
    );

    expect(words[0]?.stem).toBe("auditor");
  });

  it("leaves service words out entirely", () => {
    const words = listWords(
      buildUniverseIndex([chunk("a", "The shift and the report")]),
    );

    expect(words.map((word) => word.stem)).toEqual(["report", "shift"]);
  });

  it("has nothing to list for an empty universe", () => {
    expect(listWords(buildUniverseIndex([]))).toEqual([]);
  });
});
