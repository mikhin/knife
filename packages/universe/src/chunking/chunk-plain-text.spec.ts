import { describe, expect, it } from "vitest";
import { chunkPlainText } from "./chunk-plain-text";

describe("chunkPlainText", () => {
  it("cuts plain prose the same way it cuts markdown prose", () => {
    expect(
      chunkPlainText(
        "The shift starts at eight. Breaks are unpaid; overtime is not.",
      ),
    ).toEqual([
      "The shift starts at eight.",
      "Breaks are unpaid;",
      "overtime is not.",
    ]);
  });

  it("reads a hash and a dash as characters, not as markup", () => {
    expect(chunkPlainText("# not a heading\n\n- not a list item")).toEqual([
      "# not a heading",
      "- not a list item",
    ]);
  });

  it("keeps a wrapped paragraph together", () => {
    expect(
      chunkPlainText("The night auditor\ncloses the shift report."),
    ).toEqual(["The night auditor closes the shift report."]);
  });

  it("splits on blank lines", () => {
    expect(chunkPlainText("First rule\n\nSecond rule")).toEqual([
      "First rule",
      "Second rule",
    ]);
  });
});
