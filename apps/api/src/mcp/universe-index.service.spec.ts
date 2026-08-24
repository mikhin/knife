import { beforeEach, describe, expect, it, vi } from "vitest";
import { UniverseIndexService } from "@/mcp/universe-index.service";
import type { ChunksService, UniverseSurvey } from "@/chunks/chunks.service";
import type { Chunk } from "@knife/contract";

const PROJECT = "8f1a5c62-0f7a-4a3e-9d4e-6c1b2a3d4e5f";
const OTHER = "1d2c3b4a-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: PROJECT,
  text,
});

const TEAM = "3c9f1e2d-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

const chunks = {
  listByProject:
    vi.fn<(organizationId: string, projectId: string) => Promise<Chunk[]>>(),
  survey:
    vi.fn<
      (organizationId: string, projectId: string) => Promise<UniverseSurvey>
    >(),
};

const service = (): UniverseIndexService =>
  new UniverseIndexService(chunks as unknown as ChunksService);

describe("UniverseIndexService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chunks.listByProject.mockResolvedValue([
      chunk("a", "The night auditor closes the shift report."),
    ]);
    chunks.survey.mockResolvedValue({
      count: 1,
      newest: "2026-08-21T10:00:00.000Z",
    });
  });

  it("reads the universe once while nothing in it moves", async () => {
    const universe = service();

    const first = await universe.of(TEAM, PROJECT);
    const second = await universe.of(TEAM, PROJECT);

    expect(second).toBe(first);
    expect(chunks.listByProject).toHaveBeenCalledTimes(1);
    expect(chunks.survey).toHaveBeenCalledTimes(2);
  });

  it("counts the universe again once a chunk arrives", async () => {
    const universe = service();
    await universe.of(TEAM, PROJECT);

    chunks.survey.mockResolvedValue({
      count: 2,
      newest: "2026-08-21T11:00:00.000Z",
    });
    chunks.listByProject.mockResolvedValue([
      chunk("a", "The night auditor closes the shift report."),
      chunk("b", "A shift report reaches payroll every Monday."),
    ]);
    const after = await universe.of(TEAM, PROJECT);

    expect(after.size).toBe(2);
    expect(chunks.listByProject).toHaveBeenCalledTimes(2);
  });

  /**
   * A deletion leaves the newest chunk where it was; only the count moves,
   * and a mark that ignored it would answer from a universe already gone.
   */
  it("counts the universe again once a chunk is deleted", async () => {
    const universe = service();
    await universe.of(TEAM, PROJECT);

    chunks.survey.mockResolvedValue({
      count: 0,
      newest: "2026-08-21T10:00:00.000Z",
    });
    chunks.listByProject.mockResolvedValue([]);
    const after = await universe.of(TEAM, PROJECT);

    expect(after.size).toBe(0);
    expect(chunks.listByProject).toHaveBeenCalledTimes(2);
  });

  it("never answers about one project out of another's index", async () => {
    const universe = service();
    await universe.of(TEAM, PROJECT);

    chunks.listByProject.mockResolvedValue([
      chunk("z", "Peacocks roam the orangery unsupervised."),
    ]);
    const other = await universe.of(TEAM, OTHER);

    expect(other.byId.has("z")).toBe(true);
    expect(other.byId.has("a")).toBe(false);
  });
});
