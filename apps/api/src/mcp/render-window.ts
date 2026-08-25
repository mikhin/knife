/** What a caller asks for: where to start and how much to take. */
export type WindowAsk = {
  from: number;
  limit: number;
};

/** The slice that ask names, out of a list of any kind. */
export const pageOf = <T>(items: T[], ask: WindowAsk): T[] =>
  items.slice(ask.from, ask.from + ask.limit);

export type ListWindow = {
  from: number;
  listed: number;
  size: number;
  /** Singular: "chunk", "word". The plural is only ever this plus an s. */
  what: string;
};

/**
 * The line every list answers with. A universe of tens of thousands never
 * fits in one answer, so what stayed outside the window is counted and the
 * offset to ask from next is spelled out rather than left to arithmetic —
 * silence there would read as "that was all of it".
 */
export const renderWindow = (window: ListWindow): string => {
  if (window.size === 0) {
    return `Nothing in it yet.`;
  }

  if (window.listed === 0) {
    return `Nothing at ${window.from}: the last ${window.what} sits at ${window.size - 1}.`;
  }

  const next = window.from + window.listed;
  const rest = window.size - next;

  return rest > 0
    ? `${window.listed} listed from ${window.from}, ${rest} not listed. Ask again from ${next}.`
    : `${window.listed} listed from ${window.from}, to the end.`;
};
