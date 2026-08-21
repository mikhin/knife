import { request } from "@/api/request";
import type { Project } from "@knife/contract";

export const projectsApi = {
  create: (name: string): Promise<Project> =>
    request("/api/projects", {
      body: JSON.stringify({ name }),
      method: "POST",
    }),

  list: (): Promise<Project[]> => request("/api/projects"),

  remove: (id: string): Promise<void> =>
    request(`/api/projects/${id}`, { method: "DELETE" }),

  rename: (id: string, name: string): Promise<Project> =>
    request(`/api/projects/${id}`, {
      body: JSON.stringify({ name }),
      method: "PATCH",
    }),
} as const;
