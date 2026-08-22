import { useStore } from "@nanostores/react";
import { type JSX, type ReactNode, useState } from "react";
import { ListRow } from "@/components/list-row";
import { DeleteDialog, NameDialog } from "@/components/project-dialogs";
import { attempt } from "@/stores/failure-store";
import {
  $currentProjectId,
  $projects,
  createProject,
  deleteProject,
  renameProject,
  selectProject,
} from "@/stores/projects-store";
import { $chunks } from "@/stores/universe-store";

type Props = {
  /** Anything that acts on the open project, set apart by a divider. */
  children?: ReactNode;
};

type Asking = "delete" | "new" | "none" | "rename";

const SECTION = "border-t border-line p-3";

export const ProjectSidebar = ({ children }: Props): JSX.Element => {
  const projects = useStore($projects);
  const currentId = useStore($currentProjectId);
  const chunks = useStore($chunks);
  const [asking, setAsking] = useState<Asking>("none");

  const current = projects.find((project) => project.id === currentId);
  const close = (): void => {
    setAsking("none");
  };

  return (
    <aside
      className="flex min-h-0 w-56 shrink-0 flex-col border-r border-line"
      data-testid="project-sidebar"
    >
      <div className="flex items-center justify-between p-3">
        <h2 className="text-xs tracking-wider text-faint uppercase">
          Projects
        </h2>
        <button
          onClick={() => {
            setAsking("new");
          }}
          type="button"
        >
          New project
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3">
        {projects.length === 0 ? (
          <p className="text-xs text-faint">
            No projects yet — create one to start.
          </p>
        ) : (
          <ul className="flex flex-col gap-1" data-testid="project-list">
            {projects.map((project) => (
              <ListRow
                className="truncate"
                isSelected={project.id === currentId}
                key={project.id}
                onOpen={() => {
                  selectProject(project.id);
                }}
              >
                {project.name}
              </ListRow>
            ))}
          </ul>
        )}
      </div>

      {current ? (
        <div className={`${SECTION} flex gap-2`}>
          <button
            onClick={() => {
              setAsking("rename");
            }}
            type="button"
          >
            Rename
          </button>
          <button
            className="text-dup hover:border-dup"
            onClick={() => {
              setAsking("delete");
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}

      {children ? <div className={SECTION}>{children}</div> : null}

      {asking === "new" ? (
        <NameDialog
          action="Create"
          initial=""
          onClose={close}
          onSubmit={(name) => {
            attempt(createProject(name));
          }}
          title="New project"
        />
      ) : null}

      {current && asking === "rename" ? (
        <NameDialog
          action="Save"
          initial={current.name}
          onClose={close}
          onSubmit={(name) => {
            attempt(renameProject(current.id, name));
          }}
          title="Rename project"
        />
      ) : null}

      {current && asking === "delete" ? (
        <DeleteDialog
          chunkCount={chunks.length}
          onClose={close}
          onDelete={() => {
            attempt(deleteProject(current.id));
          }}
          project={current}
        />
      ) : null}
    </aside>
  );
};
