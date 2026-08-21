import { describe, expect, it } from "vitest";
import { splitIntoSentences } from "@/services/chunking/split-into-sentences";

describe("splitIntoSentences", () => {
  it("cuts on a dot, a semicolon and a colon", () => {
    expect(
      splitIntoSentences("One rule. Two rules; three rules: four rules"),
    ).toEqual(["One rule.", "Two rules;", "three rules:", "four rules"]);
  });

  it("keeps the mark it cut on", () => {
    expect(splitIntoSentences("A rule. Another")).toEqual([
      "A rule.",
      "Another",
    ]);
  });

  it("cuts at the end of the line without a trailing space", () => {
    expect(splitIntoSentences("A rule.")).toEqual(["A rule."]);
  });

  it("leaves a mark alone when no space follows it", () => {
    expect(splitIntoSentences("Occupancy is 87.5 at 12:30 in v1.2.3")).toEqual([
      "Occupancy is 87.5 at 12:30 in v1.2.3",
    ]);
  });

  it("swallows a run of marks instead of leaving stubs", () => {
    expect(splitIntoSentences("Really?!. The rule stands")).toEqual([
      "Really?!.",
      "The rule stands",
    ]);
  });

  it("keeps an abbreviation attached to its sentence", () => {
    expect(
      splitIntoSentences("Some roles, e.g. the auditor, are exempt"),
    ).toEqual(["Some roles, e.g. the auditor, are exempt"]);
  });

  it("still cuts after a word that merely ends like an abbreviation", () => {
    expect(splitIntoSentences("Ask the vendor. Then wait")).toEqual([
      "Ask the vendor.",
      "Then wait",
    ]);
  });

  it("drops a piece with no letters in it", () => {
    expect(splitIntoSentences("A rule. --- . 42")).toEqual(["A rule."]);
  });

  it("drops leading punctuation left by the previous cut", () => {
    expect(splitIntoSentences("A rule. ,then this")).toEqual([
      "A rule.",
      "then this",
    ]);
  });

  it("returns nothing for an empty line", () => {
    expect(splitIntoSentences("")).toEqual([]);
  });
});
