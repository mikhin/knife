import { describe, expect, it } from "vitest";
import { renderSearch } from "@/mcp/render-search";
import type { SearchReport } from "@/mcp/render-search";

const report = (over: Partial<SearchReport> = {}): SearchReport => ({
  listed: [
    {
      id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      text: "A refund request must be submitted within 48 hours.",
    },
  ],
  matched: 1,
  project: "night-audit",
  query: "refund 48",
  size: 12480,
  ...over,
});

describe("renderSearch", () => {
  it("says how big the universe searched was", () => {
    expect(renderSearch(report())).toContain(
      'Project "night-audit" holds 12480 chunks.',
    );
  });

  it("puts every hit next to its id, under the query that found it", () => {
    const text = renderSearch(report());

    expect(text).toContain('"refund 48" — 1 chunk.');
    expect(text).toContain(
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d  A refund request must be submitted within 48 hours.",
    );
  });

  it("counts the hits that did not fit", () => {
    expect(renderSearch(report({ matched: 34 }))).toContain(
      '"refund 48" — 34 chunks, 1 listed, 33 not listed.',
    );
  });

  /** Every word has to be there: a miss is a miss, not a weaker hit. */
  it("says nothing holds the whole query rather than showing near misses", () => {
    expect(
      renderSearch(report({ listed: [], matched: 0, query: "peacock refund" })),
    ).toContain('"peacock refund" — nothing holds every word of that.');
  });
});
