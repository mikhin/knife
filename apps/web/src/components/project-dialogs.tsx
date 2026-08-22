import type { Project } from "@knife/contract";
import { type JSX, useState } from "react";
import { Dialog } from "@/components/dialog";

type NameProps = {
  action: string;
  initial: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  title: string;
};

const ACTIONS = "mt-4 flex justify-end gap-2";

/** Naming a project, whether it is new or being renamed. */
export const NameDialog = ({
  action,
  initial,
  onClose,
  onSubmit,
  title,
}: NameProps): JSX.Element => {
  const [name, setName] = useState(initial);

  return (
    <Dialog onClose={onClose} title={title}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            onSubmit(name.trim());
            onClose();
          }
        }}
      >
        <input
          aria-label={title}
          className="w-full"
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Project name"
          value={name}
        />
        <div className={ACTIONS}>
          <button onClick={onClose} type="button">
            Cancel
          </button>
          <button disabled={name.trim() === ""} type="submit">
            {action}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

type DeleteProps = {
  chunkCount: number;
  onClose: () => void;
  onDelete: () => void;
  project: Project;
};

/** Deleting a project says out loud what it takes with it. */
export const DeleteDialog = ({
  chunkCount,
  onClose,
  onDelete,
  project,
}: DeleteProps): JSX.Element => (
  <Dialog onClose={onClose} title="Delete project">
    <p className="leading-relaxed">
      Delete “{project.name}” and its {chunkCount} chunks? This cannot be
      undone.
    </p>
    <div className={ACTIONS}>
      <button onClick={onClose} type="button">
        Cancel
      </button>
      <button
        className="text-dup hover:border-dup"
        onClick={() => {
          onDelete();
          onClose();
        }}
        type="button"
      >
        Delete
      </button>
    </div>
  </Dialog>
);
