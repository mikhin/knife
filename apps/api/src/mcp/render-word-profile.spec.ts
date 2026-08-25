import { describe, expect, it } from "vitest";
import { renderWordProfile } from "@/mcp/render-word-profile";
import type { WordProfileReport } from "@/mcp/render-word-profile";

const report = (over: Partial<WordProfileReport> = {}): WordProfileReport => ({
  companions: [
    { chunkCount: 455, label: "request" },
    { chunkCount: 300, label: "submitted" },
  ],
  label: "refund",
  listed: [
    {
      id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      text: "A refund request must be submitted within 48 hours.",
    },
  ],
  occurrences: 482,
  project: "night-audit",
  stem: "refund",
  ...over,
});

describe("renderWordProfile", () => {
  it("says how many chunks hold the word", () => {
    expect(renderWordProfile(report())).toContain(
      '"refund" in "night-audit": 482 chunks.',
    );
  });

  /** Company is what tells one meaning of a word from another. */
  it("names the words it travels with and how often", () => {
    expect(renderWordProfile(report())).toContain(
      "Travels with: request 455, submitted 300.",
    );
  });

  it("puts every chunk next to its id", () => {
    expect(renderWordProfile(report())).toContain(
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d  A refund request must be submitted within 48 hours.",
    );
  });

  it("counts the chunks that did not fit", () => {
    expect(renderWordProfile(report())).toContain("1 listed, 481 not listed.");
  });

  it("says so when every chunk holding the word is listed", () => {
    expect(renderWordProfile(report({ occurrences: 1 }))).toContain(
      "All of them listed.",
    );
  });

  /** Forms of one word are one word, and the answer says which one. */
  it("names the stem when the written form is not it", () => {
    expect(
      renderWordProfile(report({ label: "hours", stem: "hour" })),
    ).toContain('"hours" (every form of it, under the stem hour)');
  });

  it("says a word that keeps no company keeps none", () => {
    expect(renderWordProfile(report({ companions: [] }))).toContain(
      "It travels with nothing else.",
    );
  });
});
