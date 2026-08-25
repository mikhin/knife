import { describe, expect, it } from "vitest";
import { renderChunkProfile } from "@/mcp/render-chunk-profile";
import type { ChunkProfileReport } from "@/mcp/render-chunk-profile";

const report = (
  over: Partial<ChunkProfileReport> = {},
): ChunkProfileReport => ({
  arrived: "2026-08-21",
  hangs: false,
  id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  listed: [
    { elsewhere: 0, label: "checkout" },
    { elsewhere: 481, label: "refund" },
  ],
  project: "night-audit",
  text: "A refund request must be submitted within 48 hours of checkout.",
  words: 2,
  ...over,
});

describe("renderChunkProfile", () => {
  it("says which chunk this is, where and when it arrived", () => {
    expect(renderChunkProfile(report())).toContain(
      'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d in "night-audit", arrived 2026-08-21.',
    );
  });

  it("prints the text in full before saying anything about it", () => {
    expect(renderChunkProfile(report())).toContain(
      "A refund request must be submitted within 48 hours of checkout.",
    );
  });

  /** A zero is a word living nowhere else — the point of the whole list. */
  it("puts each word next to the number of other chunks holding it", () => {
    const text = renderChunkProfile(report());

    expect(text).toContain("  checkout 0");
    expect(text).toContain("  refund 481");
  });

  it("counts the words that did not fit", () => {
    expect(renderChunkProfile(report({ words: 40 }))).toContain(
      "2 listed, 38 not listed.",
    );
  });

  it("says outright when a chunk hangs instead of leaving zeroes to be read", () => {
    const text = renderChunkProfile(
      report({ hangs: true, listed: [{ elsewhere: 0, label: "peacock" }] }),
    );

    expect(text).toContain(
      "Nothing else in this universe shares a word with it: this chunk hangs.",
    );
  });
});
