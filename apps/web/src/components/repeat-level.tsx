import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import {
  $similarityThreshold,
  setSimilarityThreshold,
} from "@/stores/settings-store";
import { pairsAtLevel, REPEAT_LEVELS } from "@knife/universe";
import type { DuplicatePair } from "@knife/universe";

type Props = {
  pairs: DuplicatePair[];
};

export const RepeatLevel = ({ pairs }: Props): JSX.Element => {
  const threshold = useStore($similarityThreshold);
  const chosen =
    REPEAT_LEVELS.find((level) => threshold >= level.from) ??
    REPEAT_LEVELS.at(-1);

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs"
      data-testid="repeat-level"
    >
      <span className="text-faint">Repeats</span>
      {REPEAT_LEVELS.map((level) => {
        const count = pairsAtLevel(pairs, level.from).length;

        return (
          <button
            className={level === chosen ? "border-accent text-accent" : ""}
            key={level.id}
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
