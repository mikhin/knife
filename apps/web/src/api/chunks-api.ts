import { request } from "@/api/request";
import type { Chunk } from "@knife/contract";

/**
 * A sheet of any size arrives in pieces. One body carrying a whole book runs
 * into the server's request limit, and the upload failed at roughly a hundred
 * kilobytes — well below the tens of thousands of chunks this is built for.
 */
const BATCH_BYTES = 512 * 1024;

const batches = (texts: string[]): string[][] => {
  const grouped: string[][] = [];
  let current: string[] = [];
  let size = 0;

  for (const text of texts) {
    if (current.length > 0 && size + text.length > BATCH_BYTES) {
      grouped.push(current);
      current = [];
      size = 0;
    }
    current.push(text);
    size += text.length;
  }

  if (current.length > 0) {
    grouped.push(current);
  }

  return grouped;
};

export const chunksApi = {
  addMany: async (projectId: string, texts: string[]): Promise<Chunk[]> => {
    const created: Chunk[] = [];

    for (const batch of batches(texts)) {
      // One batch at a time on purpose: the point is to stay under the
      // request limit, not to open forty connections at once.
      // oxlint-disable-next-line no-await-in-loop
      const chunks = await request<Chunk[]>(
        `/api/projects/${projectId}/chunks/bulk`,
        { body: JSON.stringify({ texts: batch }), method: "POST" },
      );
      created.push(...chunks);
    }

    return created;
  },

  list: (projectId: string): Promise<Chunk[]> =>
    request(`/api/projects/${projectId}/chunks`),

  remove: (projectId: string, id: string): Promise<void> =>
    request(`/api/projects/${projectId}/chunks/${id}`, { method: "DELETE" }),
} as const;
