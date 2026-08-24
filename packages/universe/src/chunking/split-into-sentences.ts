/**
 * Abbreviations whose dot is not the end of a sentence. Short on purpose:
 * every entry is a place the splitter would otherwise cut mid-thought.
 */
const ABBREVIATIONS = new Set([
  "al",
  "approx",
  "cf",
  "co",
  "dr",
  "e.g",
  "etc",
  "ex",
  "fig",
  "i.e",
  "inc",
  "ltd",
  "max",
  "min",
  "mr",
  "mrs",
  "ms",
  "no",
  "prof",
  "resp",
  "st",
  "vs",
]);

const TERMINATORS = new Set([".", ";", ":"]);
const TRAILING_MARKS = /[.!?;:]/;

const endsWithAbbreviation = (before: string): boolean => {
  const match = /([\p{L}.]+)$/u.exec(before);
  return match ? ABBREVIATIONS.has(match[1]?.toLowerCase() ?? "") : false;
};

const clean = (piece: string): string =>
  piece
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.;:,\s]+/, "")
    .trim();

const carriesWords = (piece: string): boolean =>
  piece.length >= 2 && /\p{L}/u.test(piece);

/**
 * "Question:", "Setup:", "Acceptance criteria:" — a few words announcing what
 * comes next. Four is where the announcements in real sheets stop and actual
 * statements begin.
 */
const LABEL_WORDS = 4;

const words = (piece: string): number =>
  piece.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

const isLabel = (piece: string): boolean =>
  piece.endsWith(":") && words(piece) <= LABEL_WORDS;

/**
 * A label is not a chunk. On its own it says nothing — a heap of "Question:"
 * lines is not a heap of requirements, and every one of them reads as an
 * exact repeat of the others, burying the repeats that matter. It stays
 * attached to the sentence it introduces, which is where its meaning was.
 *
 * The last piece is kept whatever it looks like: a label with nothing behind
 * it is still the only text there, and text is never dropped on the way in.
 */
const keepLabelsAttached = (pieces: string[]): string[] => {
  const joined: string[] = [];
  let pending = "";

  for (const piece of pieces) {
    const whole = pending ? `${pending} ${piece}` : piece;

    if (isLabel(piece)) {
      pending = whole;
      continue;
    }

    joined.push(whole);
    pending = "";
  }

  if (pending) {
    joined.push(pending);
  }

  return joined;
};

/**
 * Cuts on dots, semicolons and colons — but only where the mark is followed
 * by a space or the end of the line, so 3.14, 12:30 and v1.2.3 stay whole.
 */
export const splitIntoSentences = (text: string): string[] => {
  const pieces: string[] = [];
  let start = 0;
  let index = 0;

  while (index < text.length) {
    const char = text[index] ?? "";
    const next = text[index + 1];
    const atBoundary = next === undefined || /\s/.test(next);

    if (
      TERMINATORS.has(char) &&
      atBoundary &&
      !(char === "." && endsWithAbbreviation(text.slice(start, index)))
    ) {
      let end = index + 1;
      while (end < text.length && TRAILING_MARKS.test(text[end] ?? "")) {
        end += 1;
      }
      pieces.push(text.slice(start, end));
      start = end;
      index = end;
      continue;
    }

    index += 1;
  }

  if (start < text.length) {
    pieces.push(text.slice(start));
  }

  return keepLabelsAttached(pieces.map(clean).filter(carriesWords));
};
