import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "@/services/universe/build-universe-index";
import { findDanglingChunks } from "@/services/universe/find-dangling-chunks";
import type { Chunk } from "@knife/contract";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

describe("findDanglingChunks", () => {
  it("finds the chunk that shares no word with anything else", () => {
    const dangling = findDanglingChunks(
      buildUniverseIndex([
        chunk("a", "The night auditor closes the shift report."),
        chunk("b", "A shift report reaches payroll every Monday."),
        chunk("lonely", "Peacocks roam the orangery unsupervised."),
      ]),
    );

    expect(dangling).toEqual(["lonely"]);
  });

  it("stops calling a chunk dangling once something links to it", () => {
    const dangling = findDanglingChunks(
      buildUniverseIndex([
        chunk("a", "The night auditor closes the shift report."),
        chunk("b", "A shift report reaches payroll every Monday."),
        chunk("lonely", "Peacocks roam the orangery unsupervised."),
        chunk("rescue", "The orangery peacocks are counted at dawn."),
      ]),
    );

    expect(dangling).toEqual([]);
  });

  it("does not link chunks through service words alone", () => {
    const dangling = findDanglingChunks(
      buildUniverseIndex([
        chunk("a", "The auditor is there and it is what it is."),
        chunk("b", "There it is, and this is that."),
      ]),
    );

    expect(dangling).toEqual(expect.arrayContaining(["a", "b"]));
  });
});
