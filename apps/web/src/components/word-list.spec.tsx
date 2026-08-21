// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WordList } from "@/components/word-list";
import type { WordCount } from "@/types/universe";

const word = (stem: string, chunkCount: number): WordCount => ({
  chunkCount,
  label: stem,
  stem,
});

describe("WordList", () => {
  afterEach(cleanup);

  it("shows a word with the number of chunks it appears in", () => {
    render(
      <WordList
        onPick={vi.fn<(stem: string) => void>()}
        selectedStem={undefined}
        words={[word("auditor", 12)]}
      />,
    );

    expect(screen.getByRole("button", { name: "auditor 12" })).toBeDefined();
  });

  it("hands over the stem when a word is picked", () => {
    const onPick = vi.fn<(stem: string) => void>();
    render(
      <WordList
        onPick={onPick}
        selectedStem={undefined}
        words={[word("shift", 3)]}
      />,
    );

    screen.getByRole("button", { name: "shift 3" }).click();

    expect(onPick).toHaveBeenCalledWith("shift");
  });

  it("says how many words it left off the list", () => {
    const many = Array.from({ length: 420 }, (_, position) =>
      word(`word-${position}`, 1),
    );

    render(
      <WordList
        onPick={vi.fn<(stem: string) => void>()}
        selectedStem={undefined}
        words={many}
      />,
    );

    expect(screen.getByText("20 rarer words not listed")).toBeDefined();
  });

  it("shows a picked word that sits past the cut", () => {
    const many = Array.from({ length: 420 }, (_, position) =>
      word(`word-${position}`, 420 - position),
    );

    render(
      <WordList
        onPick={vi.fn<(stem: string) => void>()}
        selectedStem="word-410"
        words={many}
      />,
    );

    expect(screen.getByRole("button", { name: "word-410 10" })).toBeDefined();
  });

  it("keeps quiet when the whole universe fits", () => {
    render(
      <WordList
        onPick={vi.fn<(stem: string) => void>()}
        selectedStem={undefined}
        words={[word("shift", 1)]}
      />,
    );

    expect(screen.queryByText(/not listed/)).toBeNull();
  });
});
