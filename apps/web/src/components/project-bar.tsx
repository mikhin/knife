import { useStore } from "@nanostores/react";
import { type ChangeEvent, type JSX, useState } from "react";
import {
  $currentProjectId,
  $projects,
  createProject,
  loadProjects,
  selectProject,
} from "@/stores/projects-store";
import { detectSourceFormat } from "@/lib/detect-source-format";
import { ingestSource } from "@/stores/universe-store";

export const ProjectBar = (): JSX.Element => {
  const projects = useStore($projects);
  const currentId = useStore($currentProjectId);
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | undefined>(undefined);

  const onFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file || !currentId) {
      return;
    }
    const count = await ingestSource(
      currentId,
      await file.text(),
      detectSourceFormat(file.name),
    );
    await loadProjects();
    setNote(`${file.name} dissolved into ${count} chunks`);
    event.target.value = "";
  };

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
      <select
        onChange={(event) => {
          selectProject(event.target.value);
        }}
        value={currentId}
      >
        {projects.length === 0 ? (
          <option value="">no projects yet</option>
        ) : null}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name} — {project.chunkCount}
          </option>
        ))}
      </select>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            void createProject(name.trim());
            setName("");
          }
        }}
      >
        <input
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="new universe"
          value={name}
        />
        <button type="submit">Create</button>
      </form>

      <label>
        <input
          accept=".md,.markdown,.mdown,.mkd,.txt,.text"
          className="sr-only"
          onChange={onFile}
          type="file"
        />
        <span className="inline-block cursor-pointer rounded-md border border-dashed border-line px-2 py-1 hover:border-accent">
          Bring a sheet (md or txt)
        </span>
      </label>

      {note ? <span className="text-xs text-accent">{note}</span> : null}
    </header>
  );
};
