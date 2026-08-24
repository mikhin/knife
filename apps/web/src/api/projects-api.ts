import { request } from "@/api/request";
import type { Guest, Project } from "@knife/contract";

export const projectsApi = {
  create: (name: string): Promise<Project> =>
    request("/api/projects", {
      body: JSON.stringify({ name }),
      method: "POST",
    }),

  guests: (id: string): Promise<Guest[]> =>
    request(`/api/projects/${id}/guests`),

  invite: (id: string, email: string): Promise<Guest> =>
    request(`/api/projects/${id}/guests`, {
      body: JSON.stringify({ email }),
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

  revoke: (id: string, email: string): Promise<void> =>
    request(`/api/projects/${id}/guests`, {
      body: JSON.stringify({ email }),
      method: "DELETE",
    }),
} as const;
