import type { JSX } from "react";
import { ListRow } from "@/components/list-row";
import type { WordCount } from "@knife/universe";

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
      {(missing ? [missing, ...listed] : listed).map((word) => (
        <ListRow
          className="flex items-baseline justify-between gap-2"
          isSelected={word.stem === selectedStem}
          key={word.stem}
          onOpen={() => {
            onPick(word.stem);
          }}
        >
          <span className="truncate">{word.label}</span>
          <span className="text-xs text-faint">{word.chunkCount}</span>
        </ListRow>
      ))}
      {words.length > MAX_ROWS ? (
        <li className="px-2 py-1 text-xs text-faint">
          {words.length - MAX_ROWS} rarer words not listed
        </li>
      ) : null}
    </ul>
  );
};
