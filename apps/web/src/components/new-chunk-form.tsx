import { type JSX, useState } from "react";

type Props = {
  onAdd: (text: string) => void;
};

export const NewChunkForm = ({ onAdd }: Props): JSX.Element => {
  const [text, setText] = useState("");

  return (
    <form
      className="mb-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) {
          onAdd(text.trim());
          setText("");
        }
      }}
    >
      <textarea
        className="flex-1 resize-y"
        onChange={(event) => {
          setText(event.target.value);
        }}
        placeholder="Write a new chunk"
        rows={2}
        value={text}
      />
      <button type="submit">Add</button>
    </form>
  );
};
