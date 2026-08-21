import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import { $searchQuery, searchWord } from "@/stores/universe-store";

type Props = {
  hits: number | undefined;
};

export const SearchBox = ({ hits }: Props): JSX.Element => {
  const query = useStore($searchQuery);

  return (
    <div className="flex items-center gap-2">
      <input
        className="w-64"
        onChange={(event) => {
          searchWord(event.target.value);
        }}
        placeholder="Search a word — shift finds shifts"
        type="search"
        value={query}
      />
      {hits === undefined ? null : (
        <span className="text-xs text-faint">{hits} chunks</span>
      )}
    </div>
  );
};
