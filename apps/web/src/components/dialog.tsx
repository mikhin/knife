import { type JSX, type ReactNode, useEffect, useRef } from "react";

type Props = {
  children: ReactNode;
  onClose: () => void;
  title: string;
};

/**
 * Whether a click on an open dialog landed on the dimmed page around it. The
 * click lands on the dialog itself either way, so the padding around the
 * content would pass for outside as well — the box is what tells them apart.
 * A key press on a button inside never gets here: it names the button.
 */
const landedOutside = (
  dialog: HTMLDialogElement,
  event: MouseEvent,
): boolean => {
  if (event.target !== dialog) {
    return false;
  }

  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
};

/**
 * A question asked in a dialog rather than in the row that asked it. Editing
 * in place made the bar rearrange itself under the cursor, and a question
 * whispered next to a button is easy to answer without reading it.
 *
 * It exists only while it is open, so it always opens fresh. The browser's
 * own dialog does the rest: Escape closes it, focus lands on the first field
 * and stays inside, and everything behind it is inert. The dimmed page around
 * it is the one part the browser leaves to us, and a click there means what
 * Escape means.
 */
export const Dialog = ({ children, onClose, title }: Props): JSX.Element => {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return undefined;
    }

    element.showModal();

    const onClick = (event: MouseEvent): void => {
      if (landedOutside(element, event)) {
        element.close();
      }
    };

    element.addEventListener("click", onClick);
    return () => {
      element.removeEventListener("click", onClick);
    };
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
