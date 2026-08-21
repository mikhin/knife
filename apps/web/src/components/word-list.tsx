import { type JSX, useEffect, useRef } from "react";
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
}: Props): JSX.Element => {
  const selectedRef = useRef<HTMLButtonElement>(null);

  /**
   * Searching a word marks its row, and the row is usually far down a list of
   * hundreds. Marking something nobody can see is the same as not marking it.
   */
  useEffect(() => {
    if (selectedStem !== undefined) {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedStem]);

  const listed = words.slice(0, MAX_ROWS);

  /**
   * A word rare enough to sit past the cut still has to be reachable: search
   * finds it, so the list shows it rather than pretending it is not there.
   */
  const missing =
    selectedStem !== undefined &&
    !listed.some((word) => word.stem === selectedStem)
      ? words.find((word) => word.stem === selectedStem)
      : undefined;

  return (
    <ul className="flex flex-col gap-1" data-testid="word-list">
      {(missing ? [missing, ...listed] : listed).map((word) => {
        const isSelected = word.stem === selectedStem;

        return (
          <li key={word.stem}>
            <button
              className={`flex w-full items-baseline justify-between gap-2 rounded-md border bg-transparent px-2 py-1 text-left ${
                isSelected ? "border-accent" : "border-transparent"
              }`}
              onClick={() => {
                onPick(word.stem);
              }}
              ref={isSelected ? selectedRef : null}
              type="button"
            >
              <span className="truncate">{word.label}</span>
              <span className="text-xs text-faint">{word.chunkCount}</span>
            </button>
          </li>
        );
      })}
      {words.length > MAX_ROWS ? (
        <li className="px-2 py-1 text-xs text-faint">
          {words.length - MAX_ROWS} rarer words not listed
        </li>
      ) : null}
    </ul>
  );
};
