import { describe, expect, it } from "vitest";
import { chunkSource } from "@/services/chunking/chunk-source";

const SHEET = "# Scheduling rules\n\n- A shift needs a position";

describe("chunkSource", () => {
  it("reads markdown as markdown", () => {
    expect(chunkSource(SHEET, "markdown")).toEqual([
      "Scheduling rules",
      "A shift needs a position",
    ]);
  });

  it("reads the same text as plain when told it is plain", () => {
    expect(chunkSource(SHEET, "text")).toEqual([
      "# Scheduling rules",
      "- A shift needs a position",
    ]);
  });

  it("has nothing to hand over when the file is empty", () => {
    expect(chunkSource("", "markdown")).toEqual([]);
    expect(chunkSource("", "text")).toEqual([]);
  });
});
