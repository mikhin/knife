import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import {
  $similarityThreshold,
  setSimilarityThreshold,
} from "@/stores/settings-store";
import type { DuplicatePair } from "@/types/universe";

type Props = {
  pairs: DuplicatePair[];
};

/**
 * Three named levels instead of a slider. A slider asked the reader to guess
 * whether 0.75 is a lot, and only showed the consequence after dragging;
 * every level here says up front how many repeats it will show.
 */
const LEVELS = [
  { from: 0.9, label: "Almost the same" },
  { from: 0.6, label: "Close" },
  { from: 0.25, label: "Loosely alike" },
] as const;

export const RepeatLevel = ({ pairs }: Props): JSX.Element => {
  const threshold = useStore($similarityThreshold);
  const chosen =
    LEVELS.find((level) => threshold >= level.from) ?? LEVELS.at(-1);

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs"
      data-testid="repeat-level"
    >
      <span className="text-faint">Repeats</span>
      {LEVELS.map((level) => {
        const count = pairs.filter(
          (pair) => pair.similarity >= level.from,
        ).length;

        return (
          <button
            className={level === chosen ? "border-accent text-accent" : ""}
            key={level.label}
            onClick={() => {
              setSimilarityThreshold(level.from);
            }}
            type="button"
          >
            {level.label} <span className="text-faint">{count}</span>
          </button>
        );
      })}
    </div>
  );
};
