import type { JSX } from "react";
import type { WordCount } from "@/types/universe";

type Props = {
  onPick: (stem: string) => void;
  selectedStem: string | undefined;
  words: WordCount[];
};

const MAX_ROWS = 400;

export const WordList = ({
  onPick,
  selectedStem,
  words,
}: Props): JSX.Element => (
  <ul className="flex flex-col gap-1" data-testid="word-list">
    {words.slice(0, MAX_ROWS).map((word) => (
      <li key={word.stem}>
        <button
          className={`flex w-full items-baseline justify-between gap-2 rounded-md border bg-transparent px-2 py-1 text-left ${
            word.stem === selectedStem ? "border-accent" : "border-transparent"
          }`}
          onClick={() => {
            onPick(word.stem);
          }}
          type="button"
        >
          <span>{word.label}</span>
          <span className="text-xs text-faint">{word.chunkCount}</span>
        </button>
      </li>
    ))}
    {words.length > MAX_ROWS ? (
      <li className="px-2 py-1 text-xs text-faint">
        {words.length - MAX_ROWS} rarer words not listed
      </li>
    ) : null}
  </ul>
);
