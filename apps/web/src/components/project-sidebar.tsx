import type { Project } from "@knife/contract";
import { useStore } from "@nanostores/react";
import { type JSX, type ReactNode, useEffect, useState } from "react";
import { BinIcon, PencilIcon } from "@/components/icons";
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

type Asking =
  | { kind: "delete" | "rename"; project: Project }
  | { kind: "new" | "none" };

/** Small enough to sit on the row without crowding the name off it. */
const ROW_ACTION = "shrink-0 border-transparent px-1 py-1 text-faint";

const SECTION = "border-t border-line p-3";

export const ProjectSidebar = ({
  children,
  onClose,
  open,
}: Props): JSX.Element => {
  const projects = useStore($projects);
  const currentId = useStore($currentProjectId);
  const chunks = useStore($chunks);
  const [asking, setAsking] = useState<Asking>({ kind: "none" });

  const close = (): void => {
    setAsking({ kind: "none" });
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
        className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-line bg-canvas transition-transform duration-150 ${
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
              setAsking({ kind: "new" });
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
                  actions={
                    <>
                      <button
                        aria-label="Rename"
                        className={ROW_ACTION}
                        onClick={() => {
                          setAsking({ kind: "rename", project });
                        }}
                        title="Rename"
                        type="button"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        aria-label="Delete"
                        className={`${ROW_ACTION} hover:border-dup hover:text-dup`}
                        onClick={() => {
                          setAsking({ kind: "delete", project });
                        }}
                        title="Delete"
                        type="button"
                      >
                        <BinIcon />
                      </button>
                    </>
                  }
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

        {children ? <div className={SECTION}>{children}</div> : null}
      </aside>

      {asking.kind === "new" ? (
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

      {asking.kind === "rename" ? (
        <NameDialog
          action="Save"
          initial={asking.project.name}
          onClose={close}
          onSubmit={(name) => {
            attempt(renameProject(asking.project.id, name));
          }}
          title="Rename project"
        />
      ) : null}

      {asking.kind === "delete" ? (
        <DeleteDialog
          chunkCount={asking.project.id === currentId ? chunks.length : 0}
          onClose={close}
          onDelete={() => {
            attempt(deleteProject(asking.project.id));
          }}
          project={asking.project}
        />
      ) : null}
    </>
  );
};
