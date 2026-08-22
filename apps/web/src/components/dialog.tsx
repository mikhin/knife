import { type JSX, type ReactNode, useEffect, useRef } from "react";

type Props = {
  children: ReactNode;
  onClose: () => void;
  title: string;
};

/**
 * A question asked in a dialog rather than in the row that asked it. Editing
 * in place made the bar rearrange itself under the cursor, and a question
 * whispered next to a button is easy to answer without reading it.
 *
 * It exists only while it is open, so it always opens fresh. The browser's
 * own dialog does the rest: Escape closes it, focus lands on the first field
 * and stays inside, and everything behind it is inert.
 */
export const Dialog = ({ children, onClose, title }: Props): JSX.Element => {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      className="m-auto w-80 max-w-[90vw] rounded-md border border-line bg-panel p-4 text-ink backdrop:bg-canvas/70"
      onCancel={onClose}
      onClose={onClose}
      ref={dialog}
    >
      <h2 className="mb-3 text-base">{title}</h2>
      {children}
    </dialog>
  );
};
