import { request } from "@/api/request";
import type { Project } from "@knife/contract";

export const projectsApi = {
  create: (name: string): Promise<Project> =>
    request("/api/projects", {
      body: JSON.stringify({ name }),
      method: "POST",
    }),

  list: (): Promise<Project[]> => request("/api/projects"),
} as const;
