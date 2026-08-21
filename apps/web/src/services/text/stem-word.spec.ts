import { describe, expect, it } from "vitest";
import { stemWord } from "@/services/text/stem-word";

describe("stemWord", () => {
  it("brings the forms of one word together", () => {
    const forms = ["shift", "shifts", "shifting", "shifted"].map(stemWord);

    expect(new Set(forms).size).toBe(1);
  });

  it("keeps unrelated words apart", () => {
    expect(stemWord("shift")).not.toBe(stemWord("schedule"));
    expect(stemWord("auditor")).not.toBe(stemWord("audit"));
  });

  /**
   * Not a bug to fix here but a cost to know: suffix stripping cannot tell a
   * word from its distant relative, so these three share one node on the
   * graph and one entry in search.
   */
  it("merges words that only look related", () => {
    expect(stemWord("authority")).toBe(stemWord("author"));
    expect(stemWord("authorization")).toBe(stemWord("author"));
    expect(stemWord("reporter")).toBe(stemWord("report"));
  });

  it("strips the endings Snowball is meant to strip", () => {
    expect(stemWord("scheduling")).toBe("schedul");
    expect(stemWord("approvals")).toBe("approv");
    expect(stemWord("nationally")).toBe("nation");
  });

  it("returns the same stem when asked again", () => {
    expect(stemWord("shifting")).toBe(stemWord("shifting"));
  });

  it("leaves a word it cannot reduce alone", () => {
    expect(stemWord("linen")).toBe("linen");
  });
});
