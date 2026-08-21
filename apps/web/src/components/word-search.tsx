import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import { $wordFilter, filterWordList } from "@/stores/universe-store";

type Props = {
  shown: number;
};

/** Narrows the word list, and nothing else: the chunks keep their own search. */
export const WordSearch = ({ shown }: Props): JSX.Element => {
  const fragment = useStore($wordFilter);

  return (
    <div className="flex items-center gap-2">
      <input
        className="w-full min-w-0"
        onChange={(event) => {
          filterWordList(event.target.value);
        }}
        placeholder="Find a word"
        type="search"
        value={fragment}
      />
      {fragment.trim() === "" ? null : (
        <span className="text-xs whitespace-nowrap text-faint">{shown}</span>
      )}
    </div>
  );
};
