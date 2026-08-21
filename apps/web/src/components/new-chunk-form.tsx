import { type JSX, useMemo, useState } from "react";
import { chunkSource } from "@/services/chunking/chunk-source";
import { detectPastedFormat } from "@/services/chunking/detect-pasted-format";

type Props = {
  onAdd: (text: string) => void;
};

/**
 * One way in, whatever the size. A sentence becomes one chunk and a whole
 * sheet becomes many, cut exactly as a file would be — and the count is said
 * before the click, so nobody pastes a book expecting a single chunk.
 */
export const NewChunkForm = ({ onAdd }: Props): JSX.Element => {
  const [text, setText] = useState("");

  const pieces = useMemo(
    () =>
      text.trim() === ""
        ? 0
        : chunkSource(text, detectPastedFormat(text)).length,
    [text],
  );

  return (
    <form
      className="mb-3 flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) {
          onAdd(text);
          setText("");
        }
      }}
    >
      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-y"
          onChange={(event) => {
            setText(event.target.value);
          }}
          placeholder="Write a chunk, or paste a whole sheet"
          rows={2}
          value={text}
        />
        <button disabled={pieces === 0} type="submit">
          Add
        </button>
      </div>

      {pieces > 0 ? (
        <span className="text-xs text-faint" data-testid="paste-preview">
          {pieces === 1 ? "One chunk" : `${pieces} chunks`}
        </span>
      ) : null}
    </form>
  );
};
