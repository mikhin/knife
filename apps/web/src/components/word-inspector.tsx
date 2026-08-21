import type { JSX } from "react";
import { HighlightedText } from "@/components/highlighted-text";
import type { Chunk } from "@knife/contract";
import type { WordProfile } from "@/types/universe";

type Props = {
  chunkById: Map<string, Chunk>;
  onOpenChunk: (id: string) => void;
  onPickWord: (stem: string) => void;
  profile: WordProfile;
};

const HEADING = "mt-5 mb-2 text-xs tracking-wider text-faint uppercase";
const MAX_OCCURRENCES = 100;

export const WordInspector = ({
  chunkById,
  onOpenChunk,
  onPickWord,
  profile,
}: Props): JSX.Element => (
  <aside
    className="overflow-y-auto border-l border-line p-3"
    data-testid="word-inspector"
  >
    <h2 className="text-xl">{profile.label}</h2>

    <section>
      <h3 className={HEADING}>Travels with</h3>
      <ul className="flex flex-wrap gap-1">
        {profile.companions.map((companion) => (
          <li key={companion.stem}>
            <button
              className="px-2 py-0.5 text-xs"
              onClick={() => {
                onPickWord(companion.stem);
              }}
              type="button"
            >
              {companion.label}
              <span className="text-faint"> {companion.chunkCount}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>

    <section>
      <h3 className={HEADING}>
        Appears in {profile.occurrences.length} chunks
      </h3>
      <ul className="flex flex-col gap-2">
        {profile.occurrences.slice(0, MAX_OCCURRENCES).map((occurrence) => (
          <li key={occurrence.chunkId}>
            <button
              className="w-full border-line bg-transparent text-left leading-relaxed"
              onClick={() => {
                onOpenChunk(occurrence.chunkId);
              }}
              type="button"
            >
              <HighlightedText
                spans={occurrence.spans}
                text={chunkById.get(occurrence.chunkId)?.text ?? ""}
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  </aside>
);
