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

/** Two people: the project can be opened to somebody by name. */
export const ShareIcon = (): JSX.Element => (
  <svg {...SVG}>
    <path d="M6 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M2 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5M10.5 4.2a2 2 0 0 1 0 3.6M12 9.8c1.3.5 2 1.7 2 3.2" />
  </svg>
);

/** A cut diamond: the linters go over the wording facet by facet. */
export const DiamondIcon = (): JSX.Element => (
  <svg {...SVG}>
    <path d="M4 2.5h8l2.5 4L8 14 1.5 6.5zM1.5 6.5h13M7.3 2.5 5.3 6.5 8 14l2.7-7.5-2-4" />
  </svg>
);
