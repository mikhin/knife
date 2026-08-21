import { describe, expect, it } from "vitest";
import { sharedWordSpans } from "@/services/universe/shared-word-spans";

const marked = (text: string, words: string[]): string[] =>
  sharedWordSpans(text, words).map((span) => text.slice(span.start, span.end));

describe("sharedWordSpans", () => {
  it("points at the shared word wherever it stands", () => {
    expect(marked("The night auditor files the report.", ["auditor"])).toEqual([
      "auditor",
    ]);
  });

  it("finds the word in whatever form this chunk spells it", () => {
    expect(marked("All shifts are approved.", ["shift"])).toEqual(["shifts"]);
  });

  it("points at every occurrence, not only the first", () => {
    expect(marked("A shift, another shift.", ["shift"])).toEqual([
      "shift",
      "shift",
    ]);
  });

  it("stays quiet when nothing is shared", () => {
    expect(sharedWordSpans("Peacocks roam the orangery.", ["auditor"])).toEqual(
      [],
    );
  });
});
