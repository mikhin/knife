import { describe, expect, it } from "vitest";
import { renderWords } from "@/mcp/render-words";
import type { WordsPage } from "@/mcp/render-words";

const page = (over: Partial<WordsPage> = {}): WordsPage => ({
  from: 0,
  listed: [{ chunkCount: 482, label: "refund", stem: "refund" }],
  project: "night-audit",
  size: 12480,
  words: 3120,
  ...over,
});

describe("renderWords", () => {
  it("says how many chunks and how many words the universe holds", () => {
    expect(renderWords(page())).toContain(
      'Project "night-audit" holds 12480 chunks, 3120 words.',
    );
  });

  it("puts the count of chunks next to the word", () => {
    expect(renderWords(page())).toContain("refund  482 chunks");
  });

  /** One row per word, not per spelling: the stem says which word it is. */
  it("names the stem when the written form is not it", () => {
    const text = renderWords(
      page({ listed: [{ chunkCount: 210, label: "hours", stem: "hour" }] }),
    );

    expect(text).toContain("hours (hour)  210 chunks");
  });

  it("counts one chunk as one", () => {
    const text = renderWords(
      page({
        listed: [{ chunkCount: 1, label: "orangery", stem: "orangeri" }],
      }),
    );

    expect(text).toContain("orangery (orangeri)  1 chunk");
  });

  it("counts the words that did not fit and says where to ask from", () => {
    const text = renderWords(page());

    expect(text).toContain("1 listed from 0, 3119 not listed.");
    expect(text).toContain("Ask again from 1.");
  });

  it("says a universe with no words has none", () => {
    expect(renderWords(page({ listed: [], size: 0, words: 0 }))).toContain(
      "Nothing in it yet.",
    );
  });
});
