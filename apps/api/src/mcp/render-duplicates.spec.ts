import { describe, expect, it } from "vitest";
import { renderDuplicates } from "@/mcp/render-duplicates";
import { repeatLevel } from "@knife/universe";
import type { DuplicateLine, DuplicatesReport } from "@/mcp/render-duplicates";

const line = (over: Partial<DuplicateLine> = {}): DuplicateLine => ({
  first: {
    id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    text: "A refund request must be submitted within 48 hours.",
  },
  polarityDiffers: false,
  second: {
    id: "c3d4e5f6-7a8b-4c9d-8e1f-2a3b4c5d6e7f",
    text: "Refund requests are submitted within 48 hours.",
  },
  sharedWords: ["refund", "request", "submitted", "hours"],
  similarity: 0.94,
  ...over,
});

const report = (over: Partial<DuplicatesReport> = {}): DuplicatesReport => ({
  level: repeatLevel("almost"),
  listed: [line()],
  matched: 1,
  project: "night-audit",
  size: 12480,
  unreachable: 0,
  ...over,
});

describe("renderDuplicates", () => {
  it("puts both texts next to their ids", () => {
    const text = renderDuplicates(report());

    expect(text).toContain("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    expect(text).toContain(
      "A refund request must be submitted within 48 hours.",
    );
    expect(text).toContain("c3d4e5f6-7a8b-4c9d-8e1f-2a3b4c5d6e7f");
    expect(text).toContain("Refund requests are submitted within 48 hours.");
  });

  it("says how big the universe is and how alike a repeat had to be", () => {
    const text = renderDuplicates(report());

    expect(text).toContain('Project "night-audit" holds 12480 chunks.');
    expect(text).toContain("Almost the same — similarity 0.90 and up");
  });

  /** The requirement the whole list rests on: nothing is silently dropped. */
  it("counts the pairs that did not fit rather than passing over them", () => {
    const text = renderDuplicates(report({ matched: 34 }));

    expect(text).toContain("34 pairs, 1 listed, 33 not listed");
  });

  it("counts one pair as one", () => {
    const text = renderDuplicates(report());

    expect(text).toContain("1 pair.");
  });

  it("counts what the calculation itself could not keep", () => {
    const text = renderDuplicates(report({ unreachable: 1200 }));

    expect(text).toContain("1200 more pairs were cut by the calculation");
  });

  it("marks a pair where one denies the other instead of calling it a repeat", () => {
    const text = renderDuplicates(
      report({
        listed: [
          line({
            first: {
              id: "e5f6a7b8-c9d0-4e1f-8a3b-4c5d6e7f8a9b",
              text: "The manager approves the write-off.",
            },
            polarityDiffers: true,
            second: {
              id: "f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c",
              text: "The manager does not approve the write-off.",
            },
          }),
        ],
      }),
    );

    expect(text).toContain("disagreement — one denies the other, not a repeat");
    expect(text).not.toContain("shares:");
  });

  it("points at the softer levels when the strict one finds nothing", () => {
    const text = renderDuplicates(report({ listed: [], matched: 0 }));

    expect(text).toContain("0 pairs");
    expect(text).toContain("Softer levels: close (0.60), loose (0.25).");
  });

  it("has nowhere softer to point from the loosest level", () => {
    const text = renderDuplicates(
      report({ level: repeatLevel("loose"), listed: [], matched: 0 }),
    );

    expect(text).not.toContain("Softer levels");
  });
});
