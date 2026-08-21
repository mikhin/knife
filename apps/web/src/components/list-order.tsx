import type { JSX } from "react";

type Option = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  onChange: (value: string) => void;
  options: Option[];
  value: string;
};

/** The one control both lists share: what comes first. */
export const ListOrder = ({
  label,
  onChange,
  options,
  value,
}: Props): JSX.Element => (
  <label className="flex items-center gap-2 text-xs">
    <span className="text-faint">{label}</span>
    <select
      onChange={(event) => {
        onChange(event.target.value);
      }}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);
