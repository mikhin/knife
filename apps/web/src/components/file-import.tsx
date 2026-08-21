import { type ChangeEvent, type JSX, useState } from "react";
import { detectSourceFormat } from "@/lib/detect-source-format";
import { attempt } from "@/stores/failure-store";
import { addText } from "@/stores/universe-store";

type Props = {
  projectId: string;
};

/**
 * Sits with the chunk form rather than in the project bar: a file fills the
 * project that is open, and next to "Create project" it read as if it would
 * make a new one.
 */
export const FileImport = ({ projectId }: Props): JSX.Element => {
  const [note, setNote] = useState<string | undefined>(undefined);

  const addFile = async (
    file: File,
    input: HTMLInputElement,
  ): Promise<void> => {
    const count = await addText(
      projectId,
      await file.text(),
      detectSourceFormat(file.name),
    );
    setNote(`Added ${count} chunks from ${file.name}`);
    input.value = "";
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      attempt(addFile(file, event.target));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block">
        <input
          accept=".md,.markdown,.mdown,.mkd,.txt,.text"
          className="sr-only"
          onChange={onFile}
          type="file"
        />
        <span className="block w-full cursor-pointer rounded-md border border-dashed border-line px-2 py-2 text-center hover:border-accent">
          Or add a whole file (.md or .txt)
        </span>
      </label>

      {note ? <span className="text-xs text-accent">{note}</span> : null}
    </div>
  );
};
