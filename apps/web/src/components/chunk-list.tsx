import { type JSX, useEffect, useRef } from "react";
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
}: Props): JSX.Element => {
  const selectedRef = useRef<HTMLButtonElement>(null);

  /**
   * A chunk is opened from the word column as often as from here, and its row
   * is usually far down the list. Marking a row nobody can see is the same as
   * not marking it.
   */
  useEffect(() => {
    if (selectedId !== undefined) {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  const listed = chunks.slice(0, MAX_ROWS);

  /** What is open stays on the list, even if it sits past the cut. */
  const missing =
    selectedId !== undefined && !listed.some((chunk) => chunk.id === selectedId)
      ? chunks.find((chunk) => chunk.id === selectedId)
      : undefined;

  return (
    <ul className="flex flex-col gap-1" data-testid="chunk-list">
      {(missing ? [missing, ...listed] : listed).map((chunk) => {
        const isSelected = chunk.id === selectedId;

        return (
          <li className="min-w-0" key={chunk.id}>
            <button
              aria-current={isSelected}
              className={`flex w-full min-w-0 items-start gap-2 rounded-md border bg-transparent px-2 py-1 text-left leading-relaxed break-words ${
                isSelected ? "border-accent" : "border-transparent"
              }`}
              onClick={() => {
                onOpen(chunk.id);
              }}
              ref={isSelected ? selectedRef : null}
              type="button"
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
                {waterIds.has(chunk.id) ? (
                  <em className={`${TAG} text-water`}>water</em>
                ) : null}
                {danglingIds.has(chunk.id) ? (
                  <em className={`${TAG} text-hang`}>hanging</em>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
      {chunks.length > MAX_ROWS ? (
        <li className="px-2 py-1 text-xs text-faint">
          {chunks.length - MAX_ROWS} more not listed — narrow it with search
        </li>
      ) : null}
    </ul>
  );
};
