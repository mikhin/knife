import { useStore } from "@nanostores/react";
import { type JSX, type ReactNode, useEffect, useState } from "react";
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
  onClose: () => void;
  open: boolean;
};

type Asking = "delete" | "new" | "none" | "rename";

const SECTION = "border-t border-line p-3";

export const ProjectSidebar = ({
  children,
  onClose,
  open,
}: Props): JSX.Element => {
  const projects = useStore($projects);
  const currentId = useStore($currentProjectId);
  const chunks = useStore($chunks);
  const [asking, setAsking] = useState<Asking>("none");

  const current = projects.find((project) => project.id === currentId);
  const close = (): void => {
    setAsking("none");
  };

  /** Escape closes the panel, the same as it closes a dialog. */
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  return (
    <>
      {open ? (
        <button
          aria-label="Close projects"
          className="fixed inset-0 z-10 rounded-none border-0 bg-canvas/60"
          onClick={onClose}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-line bg-canvas transition-transform duration-150 ${
          open ? "translate-x-0" : "invisible -translate-x-full"
        }`}
        data-testid="project-sidebar"
        inert={!open}
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
                    onClose();
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
      </aside>

      {asking === "new" ? (
        <NameDialog
          action="Create"
          initial=""
          onClose={close}
          onSubmit={(name) => {
            attempt(createProject(name));
            onClose();
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
    </>
  );
};
