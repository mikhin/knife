import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import { $failure } from "@/stores/failure-store";

/**
 * Shows up only when something failed. It used to live inside the stats row;
 * without a place of its own, a rejected action would go back to looking like
 * one that worked.
 */
export const FailureBanner = (): JSX.Element | null => {
  const failure = useStore($failure);

  if (!failure) {
    return null;
  }

  return (
    <p
      className="border-b border-dup px-4 py-1 text-xs text-dup"
      data-testid="failure"
      role="alert"
    >
      {failure}
    </p>
  );
};
