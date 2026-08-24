import type { JSX } from "react";
import { HighlightedText } from "@/components/highlighted-text";
import { sharedWordSpans } from "@knife/universe";
import type { Chunk } from "@knife/contract";
import type { LintFinding } from "@knife/contract";
import type { ChunkWord, DuplicatePair } from "@knife/universe";

type Props = {
  chunk: Chunk;
  duplicates: Array<{ other: Chunk | undefined; pair: DuplicatePair }>;
  lint: LintFinding[];
  onDelete: () => void;
  onOpenNeighbour: (id: string) => void;
  onPickWord: (stem: string) => void;
  spans: Array<{ end: number; start: number }>;
  words: ChunkWord[];
};

const HEADING = "mt-5 mb-2 text-xs tracking-wider text-faint uppercase";
const CARD = "flex flex-col gap-1 rounded-md border border-line p-2";

/**
 * Above this the two chunks say the same thing; below it they merely have
 * words in common, and calling that a duplicate sends the reader looking for
 * a repeat that is not there.
 */
const SAID_TWICE = 0.6;

/**
 * A long chunk would otherwise bury the panel under its own vocabulary. What
 * is cut off is counted below the list rather than passed over in silence.
 */
const MAX_WORDS = 40;
const PLAIN_BUTTON =
  "w-full border-transparent bg-transparent p-0 text-left hover:border-transparent hover:text-accent";

const formatDate = (iso: string): string =>
  new Date(iso).toISOString().slice(0, 10);

type NeighbourProps = {
  chunkId: string;
  onOpen: (id: string) => void;
  pairs: Array<{ other: Chunk | undefined; pair: DuplicatePair }>;
  title: string;
};

const Neighbours = ({
  chunkId,
  onOpen,
  pairs,
  title,
}: NeighbourProps): JSX.Element | null => {
  if (pairs.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className={HEADING}>{title}</h3>
      {pairs.some(({ pair }) => pair.polarityDiffers) ? (
        <p className="mb-2 text-xs text-note">
          “denies” — one of the two denies what the other says; read before
          deleting
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {pairs.map(({ other, pair }) => (
          <li className={CARD} key={`${pair.firstId}-${pair.secondId}`}>
            <button
              className={`flex gap-2 leading-relaxed ${PLAIN_BUTTON}`}
              onClick={() => {
                onOpen(pair.firstId === chunkId ? pair.secondId : pair.firstId);
              }}
              type="button"
            >
              <span className="shrink-0 text-dup">
                {Math.round(pair.similarity * 100)}%
              </span>
              {pair.polarityDiffers ? (
                <span className="shrink-0 text-note">denies</span>
              ) : null}
              <span className="min-w-0">
                {other ? (
                  <HighlightedText
                    spans={sharedWordSpans(other.text, pair.sharedWords)}
                    text={other.text}
                  />
                ) : (
                  "gone"
                )}
              </span>
            </button>
            {other ? (
              <span className="text-xs text-faint">
                {formatDate(other.createdAt)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const ChunkInspector = ({
  chunk,
  duplicates,
  lint,
  onDelete,
  onOpenNeighbour,
  onPickWord,
  spans,
  words,
}: Props): JSX.Element => (
  <aside
    className="overflow-y-auto border-l border-line p-3"
    data-testid="chunk-inspector"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-faint">{formatDate(chunk.createdAt)}</span>
      <button
        className="text-dup hover:border-dup"
        onClick={onDelete}
        type="button"
      >
        Delete
      </button>
    </div>

    <p className="mt-3 text-[15px] leading-relaxed break-words">
      <HighlightedText spans={spans} text={chunk.text} />
    </p>

    {words.length > 0 ? (
      <section>
        <h3 className={HEADING}>Made of</h3>
        <ul className="flex flex-wrap gap-1">
          {words.slice(0, MAX_WORDS).map((word) => (
            <li key={word.stem}>
              <button
                className="px-2 py-0.5 text-xs"
                onClick={() => {
                  onPickWord(word.stem);
                }}
                type="button"
              >
                {word.label}
                <span className="text-faint"> {word.elsewhere}</span>
              </button>
            </li>
          ))}
        </ul>
        {words.length > MAX_WORDS ? (
          <p className="mt-2 text-xs text-faint">
            and {words.length - MAX_WORDS} more
          </p>
        ) : null}
      </section>
    ) : null}

    <Neighbours
      chunkId={chunk.id}
      onOpen={onOpenNeighbour}
      pairs={duplicates.filter(({ pair }) => pair.similarity >= SAID_TWICE)}
      title="Said twice"
    />

    <Neighbours
      chunkId={chunk.id}
      onOpen={onOpenNeighbour}
      pairs={duplicates.filter(({ pair }) => pair.similarity < SAID_TWICE)}
      title="Shares words"
    />

    {lint.length > 0 ? (
      <section>
        <h3 className={HEADING}>Linters</h3>
        <ul className="flex flex-col gap-2">
          {lint.map((finding) => (
            <li
              className={CARD}
              key={`${finding.tool}-${finding.rule}-${finding.offset}`}
            >
              <code className="text-xs text-note">
                {finding.tool}/{finding.rule}
              </code>
              <span>{finding.message}</span>
            </li>
          ))}
        </ul>
      </section>
    ) : null}
  </aside>
);
