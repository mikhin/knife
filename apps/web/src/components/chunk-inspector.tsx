import type { JSX } from "react";
import { HighlightedText } from "@/components/highlighted-text";
import type { Chunk } from "@knife/contract";
import type { LintFinding } from "@knife/contract";
import type { DuplicatePair, WaterVerdict } from "@/types/universe";

type Props = {
  chunk: Chunk;
  duplicates: Array<{ other: Chunk | undefined; pair: DuplicatePair }>;
  isDangling: boolean;
  lint: LintFinding[];
  onDelete: () => void;
  onOpenNeighbour: (id: string) => void;
  spans: Array<{ end: number; start: number }>;
  water: undefined | WaterVerdict;
};

const HEADING = "mt-5 mb-2 text-xs tracking-wider text-faint uppercase";
const CARD = "flex flex-col gap-0.5";

const formatDate = (iso: string): string =>
  new Date(iso).toISOString().slice(0, 10);

export const ChunkInspector = ({
  chunk,
  duplicates,
  isDangling,
  lint,
  onDelete,
  onOpenNeighbour,
  spans,
  water,
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

    {isDangling ? (
      <section>
        <h3 className={HEADING}>Hanging</h3>
        <p className="text-xs text-faint">
          Not one of its words appears anywhere else in the universe.
        </p>
      </section>
    ) : null}

    {water ? (
      <section>
        <h3 className={HEADING}>Water</h3>
        <ul className="flex flex-col gap-2">
          {water.findings.map((finding) => (
            <li className={CARD} key={finding.rule}>
              <code className="text-xs text-water">{finding.rule}</code>
              <span>{finding.explanation}</span>
              <span className="text-xs text-faint">{finding.evidence}</span>
            </li>
          ))}
        </ul>
      </section>
    ) : null}

    {duplicates.length > 0 ? (
      <section>
        <h3 className={HEADING}>Duplicates</h3>
        <ul className="flex flex-col gap-2">
          {duplicates.map(({ other, pair }) => (
            <li className={CARD} key={`${pair.firstId}-${pair.secondId}`}>
              <button
                className="flex gap-2 border-line bg-transparent text-left leading-relaxed"
                onClick={() => {
                  onOpenNeighbour(
                    pair.firstId === chunk.id ? pair.secondId : pair.firstId,
                  );
                }}
                type="button"
              >
                <span className="shrink-0 text-dup">
                  {Math.round(pair.similarity * 100)}%
                </span>
                {pair.polarityDiffers ? (
                  <span className="shrink-0 text-water">denies</span>
                ) : null}
                <span>{other?.text ?? "gone"}</span>
              </button>
              <span className="text-xs text-faint">
                shared: {pair.sharedWords.join(", ")}
              </span>
              {pair.polarityDiffers ? (
                <span className="text-xs text-water">
                  one of the two denies what the other says — read before
                  deleting
                </span>
              ) : null}
              {other ? (
                <span className="text-xs text-faint">
                  {formatDate(other.createdAt)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    ) : null}

    {lint.length > 0 ? (
      <section>
        <h3 className={HEADING}>Linters</h3>
        <ul className="flex flex-col gap-2">
          {lint.map((finding) => (
            <li
              className={CARD}
              key={`${finding.tool}-${finding.rule}-${finding.offset}`}
            >
              <code className="text-xs text-water">
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
