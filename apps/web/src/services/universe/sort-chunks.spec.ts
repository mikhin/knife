import type { Chunk } from "@knife/contract";
import { describe, expect, it } from "vitest";
import { sortChunks } from "@/services/universe/sort-chunks";

const chunk = (id: string, text: string, createdAt: string): Chunk => ({
  createdAt,
  id,
  projectId: "universe",
  text,
});

const chunks = [
  chunk("middle", "A shift starts at eight.", "2025-06-01T00:00:00.000Z"),
  chunk("newest", "Short.", "2026-08-01T00:00:00.000Z"),
  chunk(
    "oldest",
    "The night auditor closes the shift report before midnight.",
    "2024-01-01T00:00:00.000Z",
  ),
];

const noMarks = {
  dangling: new Set<string>(),
  duplicates: new Set<string>(),
  noted: new Set<string>(),
};

describe("sortChunks", () => {
  it("puts the newest arrival first", () => {
    expect(
      sortChunks(chunks, "newest", noMarks).map((found) => found.id),
    ).toEqual(["newest", "middle", "oldest"]);
  });

  it("puts the oldest arrival first", () => {
    expect(
      sortChunks(chunks, "oldest", noMarks).map((found) => found.id),
    ).toEqual(["oldest", "middle", "newest"]);
  });

  it("puts the longest text first", () => {
    expect(
      sortChunks(chunks, "longest", noMarks).map((found) => found.id),
    ).toEqual(["oldest", "middle", "newest"]);
  });

  it("puts what the checks flagged first, the worst of it ahead", () => {
    const flagged = sortChunks(chunks, "problems", {
      dangling: new Set(["newest"]),
      duplicates: new Set(["middle"]),
      noted: new Set<string>(),
    });

    expect(flagged.map((found) => found.id)).toEqual([
      "middle",
      "newest",
      "oldest",
    ]);
  });

  it("puts a linter note above a chunk standing on its own", () => {
    const flagged = sortChunks(chunks, "problems", {
      dangling: new Set(["oldest"]),
      duplicates: new Set<string>(),
      noted: new Set(["newest"]),
    });

    expect(flagged.map((found) => found.id)).toEqual([
      "newest",
      "oldest",
      "middle",
    ]);
  });

  it("puts a repeat the linters also wrote on ahead of a plain repeat", () => {
    const flagged = sortChunks(chunks, "problems", {
      dangling: new Set<string>(),
      duplicates: new Set(["middle", "newest"]),
      noted: new Set(["newest"]),
    });

    expect(flagged.map((found) => found.id)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("leaves the original list untouched", () => {
    const order = chunks.map((found) => found.id);
    sortChunks(chunks, "newest", noMarks);

    expect(chunks.map((found) => found.id)).toEqual(order);
  });
});
