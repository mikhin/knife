import type { JSX } from "react";

const SVG = {
  "aria-hidden": true,
  fill: "none",
  height: 14,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.5,
  viewBox: "0 0 16 16",
  width: 14,
} as const;

/** A pencil: the row can be renamed. */
export const PencilIcon = (): JSX.Element => (
  <svg {...SVG}>
    <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L6 12l-2.5.5L4 10z" />
  </svg>
);

/** A bin: the row can be thrown away. */
export const BinIcon = (): JSX.Element => (
  <svg {...SVG}>
    <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.5 6.5v5M9.5 6.5v5" />
  </svg>
);
