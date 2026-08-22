/**
 * Walks a list of rows with the arrow keys: the neighbour takes the focus
 * and is opened, the same as if it had been clicked. Reading through a
 * universe means opening one row after another, and reaching for the mouse
 * every time is the slow way round.
 *
 * Returns false when the key is not an arrow, so the caller leaves it alone.
 */
export const stepThroughList = (row: HTMLElement, key: string): boolean => {
  const step = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
  if (step === 0) {
    return false;
  }

  const rows = [...(row.closest("ul")?.querySelectorAll("button") ?? [])];
  const next = rows[rows.indexOf(row as HTMLButtonElement) + step];
  if (next === undefined) {
    return true;
  }

  next.focus();
  next.click();
  return true;
};
