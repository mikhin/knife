import { useStore } from "@nanostores/react";
import { type JSX, useState } from "react";
import { ProjectActions } from "@/components/project-actions";
import { attempt } from "@/stores/failure-store";
import {
  $currentProjectId,
  $projects,
  createProject,
  selectProject,
} from "@/stores/projects-store";
import { $chunks } from "@/stores/universe-store";

export const ProjectBar = (): JSX.Element => {
  const projects = useStore($projects);
  const currentId = useStore($currentProjectId);
  const chunks = useStore($chunks);
  const [name, setName] = useState("");

  const current = projects.find((project) => project.id === currentId);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
      <label className="flex items-center gap-2">
        <span className="text-faint">Project</span>
        <select
          disabled={projects.length === 0}
          onChange={(event) => {
            selectProject(event.target.value);
          }}
          value={currentId}
        >
          {projects.length === 0 ? (
            <option value="">No projects yet — create one</option>
          ) : null}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      {current ? (
        <ProjectActions chunkCount={chunks.length} project={current} />
      ) : null}

      <form
        className="ml-auto flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            attempt(createProject(name.trim()));
            setName("");
          }
        }}
      >
        <input
          aria-label="Name for a new project"
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="New project name"
          value={name}
        />
        <button type="submit">Create project</button>
      </form>
    </header>
  );
};
