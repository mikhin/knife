import { persistentAtom } from "@nanostores/persistent";
import { atom } from "nanostores";
import { projectsApi } from "@/api/projects-api";
import type { Project } from "@knife/contract";

export const $projects = atom<Project[]>([]);
export const $currentProjectId = persistentAtom<string>("knife:project", "");

export const loadProjects = async (): Promise<Project[]> => {
  const projects = await projectsApi.list();
  $projects.set(projects);

  const current = $currentProjectId.get();
  const stillThere = projects.some((project) => project.id === current);
  if (!stillThere) {
    $currentProjectId.set(projects[0]?.id ?? "");
  }

  return projects;
};

export const createProject = async (name: string): Promise<Project> => {
  const project = await projectsApi.create(name);
  await loadProjects();
  $currentProjectId.set(project.id);
  return project;
};

export const renameProject = async (
  id: string,
  name: string,
): Promise<void> => {
  await projectsApi.rename(id, name);
  await loadProjects();
};

/**
 * Takes the project's chunks with it, and there is no undo. The screen asks
 * before calling this.
 */
export const deleteProject = async (id: string): Promise<void> => {
  await projectsApi.remove(id);
  await loadProjects();
};

export const selectProject = (id: string): void => {
  $currentProjectId.set(id);
};
