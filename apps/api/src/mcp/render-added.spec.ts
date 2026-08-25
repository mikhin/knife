import { describe, expect, it } from "vitest";
import { renderAdded } from "@/mcp/render-added";
import type { AddedChunks } from "@/mcp/render-added";

const added = (over: Partial<AddedChunks> = {}): AddedChunks => ({
  added: 1,
  listed: [
    {
      id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      text: "A refund request must be submitted within 48 hours.",
    },
  ],
  project: "night-audit",
  ...over,
});

describe("renderAdded", () => {
  /** The sheet is gone; these ids are the only handle left on what it said. */
  it("hands back every new chunk under its id", () => {
    const text = renderAdded(added());

    expect(text).toContain(
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d  A refund request must be submitted within 48 hours.",
    );
  });

  it("counts one chunk as one", () => {
    expect(renderAdded(added())).toContain('Added 1 chunk to "night-audit".');
  });

  it("counts the new chunks that did not fit", () => {
    expect(renderAdded(added({ added: 84 }))).toContain(
      'Added 84 chunks to "night-audit", 1 listed, 83 not listed.',
    );
  });

  it("says text that cut down to nothing added nothing", () => {
    expect(renderAdded(added({ added: 0, listed: [] }))).toContain(
      'Nothing was added to "night-audit": that text cut down to no chunks.',
    );
  });
});
