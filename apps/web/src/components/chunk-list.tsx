import type { JSX } from "react";
import { HighlightedText } from "@/components/highlighted-text";
import { ListRow } from "@/components/list-row";
import type { Chunk } from "@knife/contract";

type Props = {
  chunks: Chunk[];
  danglingIds: ReadonlySet<string>;
  duplicateIds: ReadonlySet<string>;
  noteCounts: ReadonlyMap<string, number>;
  onOpen: (id: string) => void;
  selectedId: string | undefined;
  spansByChunk: Map<string, Array<{ end: number; start: number }>>;
};

const MAX_ROWS = 300;
const TAG = "rounded border px-1.5 text-[11px] not-italic";

export const ChunkList = ({
  chunks,
  danglingIds,
  duplicateIds,
  noteCounts,
  onOpen,
  selectedId,
  spansByChunk,
}: Props): JSX.Element => {
  const listed = chunks.slice(0, MAX_ROWS);

  /** What is open stays on the list, even if it sits past the cut. */
  const missing =
    selectedId !== undefined && !listed.some((chunk) => chunk.id === selectedId)
      ? chunks.find((chunk) => chunk.id === selectedId)
      : undefined;

  return (
    <ul className="flex flex-col gap-1" data-testid="chunk-list">
      {(missing ? [missing, ...listed] : listed).map((chunk) => (
        <ListRow
          className="flex min-w-0 items-start gap-2 leading-relaxed break-words"
          isSelected={chunk.id === selectedId}
          key={chunk.id}
          onOpen={() => {
            onOpen(chunk.id);
          }}
        >
          <span className="min-w-0 flex-1" data-testid="chunk-text">
            <HighlightedText
              spans={spansByChunk.get(chunk.id) ?? []}
              text={chunk.text}
            />
          </span>
          <span className="flex shrink-0 gap-1 pt-0.5">
            {duplicateIds.has(chunk.id) ? (
              <em className={`${TAG} text-dup`}>dup</em>
            ) : null}
            {noteCounts.get(chunk.id) ? (
              <em className={`${TAG} text-note`}>
                notes {noteCounts.get(chunk.id)}
              </em>
            ) : null}
            {danglingIds.has(chunk.id) ? (
              <em className={`${TAG} text-hang`}>hanging</em>
            ) : null}
          </span>
        </ListRow>
      ))}
      {chunks.length > MAX_ROWS ? (
        <li className="px-2 py-1 text-xs text-faint">
          {chunks.length - MAX_ROWS} more not listed — narrow it with search
        </li>
      ) : null}
    </ul>
  );
};
