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

  return pieces.map(clean).filter(carriesWords);
};
