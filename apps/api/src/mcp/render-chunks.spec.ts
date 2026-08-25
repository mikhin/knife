import { describe, expect, it } from "vitest";
import { renderChunks } from "@/mcp/render-chunks";
import type { ChunksPage } from "@/mcp/render-chunks";

const page = (over: Partial<ChunksPage> = {}): ChunksPage => ({
  from: 0,
  listed: [
    {
      id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      text: "A refund request must be submitted within 48 hours.",
    },
  ],
  project: "night-audit",
  size: 3,
  ...over,
});

describe("renderChunks", () => {
  it("puts every chunk next to its id", () => {
    const text = renderChunks(page());

    expect(text).toContain(
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d  A refund request must be submitted within 48 hours.",
    );
  });

  it("says how big the universe is", () => {
    expect(renderChunks(page({ size: 12480 }))).toContain(
      'Project "night-audit" holds 12480 chunks.',
    );
  });

  /** The requirement the whole list rests on: nothing is silently dropped. */
  it("counts what did not fit and says where to ask from next", () => {
    const text = renderChunks(page({ size: 12480 }));

    expect(text).toContain("1 listed from 0, 12479 not listed.");
    expect(text).toContain("Ask again from 1.");
  });

  it("says when a window reaches the end rather than inviting another call", () => {
    const text = renderChunks(page({ from: 2, size: 3 }));

    expect(text).toContain("1 listed from 2, to the end.");
    expect(text).not.toContain("Ask again");
  });

  it("points back at the last chunk when asked past the end", () => {
    const text = renderChunks(page({ from: 900, listed: [], size: 12 }));

    expect(text).toContain("Nothing at 900: the last chunk sits at 11.");
  });

  it("says an empty universe is empty, not that a window missed", () => {
    expect(renderChunks(page({ listed: [], size: 0 }))).toContain(
      "Nothing in it yet.",
    );
  });
});
