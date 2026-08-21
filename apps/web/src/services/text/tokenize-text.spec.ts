import { describe, expect, it } from "vitest";
import { tokenizeText } from "@/services/text/tokenize-text";

const stems = (text: string): string[] =>
  tokenizeText(text).map((token) => token.stem);

const contentStems = (text: string): string[] =>
  tokenizeText(text)
    .filter((token) => !token.isStop)
    .map((token) => token.stem);

describe("tokenizeText", () => {
  it("gives every form of a word the same stem", () => {
    expect(stems("shift shifts shifting shifted")).toEqual([
      "shift",
      "shift",
      "shift",
      "shift",
    ]);
  });

  it("keeps a number as a word of its own", () => {
    expect(contentStems("Retention is 30 days")).toEqual([
      "retent",
      "30",
      "day",
    ]);
  });

  it("keeps a decimal and a version whole", () => {
    expect(contentStems("Occupancy 87.5 in release 1.2.3")).toEqual([
      "occup",
      "87.5",
      "releas",
      "1.2.3",
    ]);
  });

  it("keeps a number that carries its unit", () => {
    expect(contentStems("A 30d window")).toEqual(["30d", "window"]);
  });

  it("keeps a negation as a word rather than dropping it", () => {
    expect(contentStems("The manager does not approve")).toEqual([
      "manag",
      "not",
      "approv",
    ]);
  });

  it("keeps a contracted negation attached to its verb", () => {
    const bare = contentStems("The manager doesn't approve");

    expect(bare).toContain("approv");
    expect(bare.some((stem) => stem.startsWith("doesn"))).toBe(true);
  });

  it("drops a possessive but keeps the word", () => {
    expect(contentStems("The auditor's report")).toEqual(["auditor", "report"]);
  });

  it("marks service words so links are never drawn through them", () => {
    const tokens = tokenizeText("the shift and the report");

    expect(
      tokens.filter((token) => token.isStop).map((t) => t.surface),
    ).toEqual(["the", "and", "the"]);
  });

  it("points at where the word sits in the text", () => {
    const text = "All shifts are approved";
    const token = tokenizeText(text).find((each) => each.stem === "shift");

    expect(text.slice(token?.start ?? 0, token?.end ?? 0)).toBe("shifts");
  });

  it("skips a lone letter but not a lone digit", () => {
    expect(contentStems("a 7 day window")).toEqual(["7", "day", "window"]);
  });

  it("splits a hyphenated pair so it meets the same words apart", () => {
    expect(contentStems("real-time report")).toEqual([
      "real",
      "time",
      "report",
    ]);
  });

  it("finds nothing in punctuation alone", () => {
    expect(tokenizeText("--- ... |")).toEqual([]);
  });
});
