import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import { $searchQuery, searchChunks } from "@/stores/universe-store";

type Props = {
  hits: number | undefined;
};

/**
 * Searches the chunks. A fragment is enough — "shif" finds every shift — and
 * what matched is highlighted in the text itself.
 */
export const TextSearch = ({ hits }: Props): JSX.Element => {
  const query = useStore($searchQuery);

  return (
    <div className="mb-3 flex items-center gap-2">
      <input
        className="flex-1"
        onChange={(event) => {
          searchChunks(event.target.value);
        }}
        placeholder="Find in chunks"
        type="search"
        value={query}
      />
      {hits === undefined ? null : (
        <span className="text-xs whitespace-nowrap text-faint">
          {hits} found
        </span>
      )}
    </div>
  );
};
