import type { JSX } from "react";
import { HighlightedText } from "@/components/highlighted-text";
import type { Chunk } from "@knife/contract";

type Props = {
  chunks: Chunk[];
  danglingIds: ReadonlySet<string>;
  duplicateIds: ReadonlySet<string>;
  onOpen: (id: string) => void;
  selectedId: string | undefined;
  spansByChunk: Map<string, Array<{ end: number; start: number }>>;
  waterIds: ReadonlySet<string>;
};

const MAX_ROWS = 300;
const TAG = "rounded border px-1.5 text-[11px] not-italic";

export const ChunkList = ({
  chunks,
  danglingIds,
  duplicateIds,
  onOpen,
  selectedId,
  spansByChunk,
  waterIds,
}: Props): JSX.Element => (
  <ul className="flex flex-col gap-1" data-testid="chunk-list">
    {chunks.slice(0, MAX_ROWS).map((chunk) => (
      <li className="flex min-w-0 items-start gap-2" key={chunk.id}>
        <button
          className={`min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 text-left leading-relaxed break-words ${
            chunk.id === selectedId ? "border-accent" : "border-transparent"
          }`}
          onClick={() => {
            onOpen(chunk.id);
          }}
          type="button"
        >
          <HighlightedText
            spans={spansByChunk.get(chunk.id) ?? []}
            text={chunk.text}
          />
        </button>
        <span className="flex shrink-0 gap-1 pt-2">
          {duplicateIds.has(chunk.id) ? (
            <em className={`${TAG} text-dup`}>dup</em>
          ) : null}
          {waterIds.has(chunk.id) ? (
            <em className={`${TAG} text-water`}>water</em>
          ) : null}
          {danglingIds.has(chunk.id) ? (
            <em className={`${TAG} text-hang`}>hanging</em>
          ) : null}
        </span>
      </li>
    ))}
    {chunks.length > MAX_ROWS ? (
      <li className="px-2 py-1 text-xs text-faint">
        {chunks.length - MAX_ROWS} more not listed — narrow it with search
      </li>
    ) : null}
  </ul>
);
