import { request } from "@/api/request";
import type { Chunk } from "@knife/contract";

export const chunksApi = {
  add: (projectId: string, text: string): Promise<Chunk> =>
    request(`/api/projects/${projectId}/chunks`, {
      body: JSON.stringify({ text }),
      method: "POST",
    }),

  addMany: (projectId: string, texts: string[]): Promise<Chunk[]> =>
    request(`/api/projects/${projectId}/chunks/bulk`, {
      body: JSON.stringify({ texts }),
      method: "POST",
    }),

  list: (projectId: string): Promise<Chunk[]> =>
    request(`/api/projects/${projectId}/chunks`),

  remove: (id: string): Promise<void> =>
    request(`/api/chunks/${id}`, { method: "DELETE" }),
} as const;
