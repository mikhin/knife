import type { JSX } from "react";

type Span = {
  end: number;
  start: number;
};

type Props = {
  spans: Span[];
  text: string;
};

const merge = (spans: Span[]): Span[] => {
  const merged: Span[] = [];

  for (const span of spans.toSorted((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
      continue;
    }
    merged.push({ ...span });
  }

  return merged;
};

export const HighlightedText = ({ spans, text }: Props): JSX.Element => {
  if (spans.length === 0) {
    return <>{text}</>;
  }

  const parts: JSX.Element[] = [];
  let cursor = 0;

  for (const span of merge(spans)) {
    if (span.start > cursor) {
      parts.push(
        <span key={`plain-${cursor}`}>{text.slice(cursor, span.start)}</span>,
      );
    }
    parts.push(
      <mark key={`hit-${span.start}`}>{text.slice(span.start, span.end)}</mark>,
    );
    cursor = span.end;
  }

  if (cursor < text.length) {
    parts.push(<span key={`plain-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
};
