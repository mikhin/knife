import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import {
  $similarityThreshold,
  setSimilarityThreshold,
} from "@/stores/settings-store";

type Props = {
  floor: number;
  shown: number;
  total: number;
};

export const ThresholdSlider = ({
  floor,
  shown,
  total,
}: Props): JSX.Element => {
  const threshold = useStore($similarityThreshold);

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="whitespace-nowrap">
        Similarity ≥ {threshold.toFixed(2)}
      </span>
      <input
        className="w-40 border-none bg-transparent p-0"
        max={0.99}
        min={floor}
        onChange={(event) => {
          setSimilarityThreshold(Number(event.target.value));
        }}
        step={0.01}
        type="range"
        value={threshold}
      />
      <span className="whitespace-nowrap text-faint">
        {shown} of {total} pairs
      </span>
    </label>
  );
};
