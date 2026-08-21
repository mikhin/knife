import type { Project } from "@knife/contract";
import { type JSX, useState } from "react";
import { attempt } from "@/stores/failure-store";
import { deleteProject, renameProject } from "@/stores/projects-store";

type Props = {
  /** Counted from the universe on screen, not from the last list request. */
  chunkCount: number;
  project: Project;
};

type Mode = "confirming" | "idle" | "renaming";

/**
 * Rename and delete sit next to the project they act on, and delete says out
 * loud what it is about to take with it — the chunks do not come back.
 */
export const ProjectActions = ({ chunkCount, project }: Props): JSX.Element => {
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState(project.name);

  if (mode === "renaming") {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            attempt(renameProject(project.id, name.trim()));
            setMode("idle");
          }
        }}
      >
        <input
          aria-label="New name for this project"
          onChange={(event) => {
            setName(event.target.value);
          }}
          value={name}
        />
        <button type="submit">Save</button>
        <button
          onClick={() => {
            setName(project.name);
            setMode("idle");
          }}
          type="button"
        >
          Cancel
        </button>
      </form>
    );
  }

  if (mode === "confirming") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs">
          Delete “{project.name}” and its {chunkCount} chunks? This cannot be
          undone.
        </span>
        <button
          className="text-dup hover:border-dup"
          onClick={() => {
            attempt(deleteProject(project.id));
            setMode("idle");
          }}
          type="button"
        >
          Yes, delete
        </button>
        <button
          onClick={() => {
            setMode("idle");
          }}
          type="button"
        >
          Keep it
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          setName(project.name);
          setMode("renaming");
        }}
        type="button"
      >
        Rename
      </button>
      <button
        className="text-dup hover:border-dup"
        onClick={() => {
          setMode("confirming");
        }}
        type="button"
      >
        Delete
      </button>
    </div>
  );
};
