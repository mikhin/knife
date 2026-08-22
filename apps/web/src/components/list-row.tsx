import {
  type JSX,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { stepThroughList } from "@/lib/step-through-list";

type Props = {
  children: ReactNode;
  className: string;
  isSelected: boolean;
  onOpen: () => void;
};

/**
 * One row of either column. Both lists are read the same way — walked with
 * the arrows, opened on the way past, and kept in view once open — so they
 * are the same row with different things written in it.
 */
export const ListRow = ({
  children,
  className,
  isSelected,
  onOpen,
}: Props): JSX.Element => {
  const row = useRef<HTMLButtonElement>(null);

  /** Marking a row nobody can see is the same as not marking it. */
  useEffect(() => {
    if (isSelected) {
      row.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  return (
    <li className="min-w-0">
      <button
        aria-current={isSelected}
        className={`w-full rounded-md border bg-transparent px-2 py-1 text-left ${
          isSelected ? "border-accent" : "border-transparent"
        } ${className}`}
        onClick={onOpen}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (stepThroughList(event.currentTarget, event.key)) {
            event.preventDefault();
          }
        }}
        ref={row}
        type="button"
      >
        {children}
      </button>
    </li>
  );
};
