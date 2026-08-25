import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetWordTool } from "@/mcp/get-word.tool";
import { buildUniverseIndex } from "@knife/universe";
import type {
  AgentUniverseService,
  Reached,
} from "@/mcp/agent-universe.service";
import type { Chunk } from "@knife/contract";
import type { UniverseIndex } from "@knife/universe";

const PERSON = "3c9f1e2d-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const PROJECT = "8f1a5c62-0f7a-4a3e-9d4e-6c1b2a3d4e5f";

const reached = {
  project: { id: PROJECT, name: "night-audit" },
  viewer: { id: PERSON },
} as unknown as Reached;

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: PROJECT,
  text,
});

const UNIVERSE = [
  chunk("chunk-1", "A refund request must be submitted within 48 hours."),
  chunk("chunk-2", "Refund requests are submitted within 48 hours."),
  chunk("chunk-3", "Peacocks in the orangery are counted at dawn."),
];

const agent = {
  index: vi.fn<(reached: Reached) => Promise<UniverseIndex>>(),
  reach: vi.fn<(userId: string, project: string) => Promise<Reached>>(),
};

const tool = (): GetWordTool =>
  new GetWordTool(agent as unknown as AgentUniverseService);

describe("GetWordTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agent.reach.mockResolvedValue(reached);
    agent.index.mockResolvedValue(buildUniverseIndex(UNIVERSE));
  });

  /**
   * Требование: формы одного слова — одно слово. Агент пишет слово так, как
   * оно стоит в тексте, и попадает туда же, куда человек кликом по слову.
   */
  it("reaches one word from any of its forms", async () => {
    const said = await tool().run(PERSON, "night-audit", "refunds", 20);

    expect(said).toContain("chunk-1");
    expect(said).toContain("chunk-2");
    expect(said).not.toContain("chunk-3");
  });

  it("says a service word carries no meaning rather than answering nothing", async () => {
    const said = await tool().run(PERSON, "night-audit", "the", 20);

    expect(said).toContain("is a service word");
  });

  /** Промах отвечает тем, что во вселенной есть, а не одним «нет». */
  it("points at the words that do exist when one does not", async () => {
    const said = await tool().run(PERSON, "night-audit", "peaco", 20);

    expect(said).toContain('No word like "peaco" in "night-audit".');
    expect(said).toContain("Nearest: peacocks");
  });

  it("counts the chunks it did not print", async () => {
    const said = await tool().run(PERSON, "night-audit", "refund", 1);

    expect(said).toContain("1 listed, 1 not listed.");
  });
});
