import { beforeEach, describe, expect, it, vi } from "vitest";
import { LintUniverseTool } from "@/mcp/lint-universe.tool";
import type { LintService } from "@/lint/lint.service";
import type {
  AgentUniverseService,
  Reached,
} from "@/mcp/agent-universe.service";
import type { Chunk, LintFinding, LintReport } from "@knife/contract";

const PERSON = "3c9f1e2d-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const PROJECT = "8f1a5c62-0f7a-4a3e-9d4e-6c1b2a3d4e5f";

const reached = {
  project: {
    createdAt: "2026-08-21T10:00:00.000Z",
    id: PROJECT,
    mine: true,
    name: "night-audit",
    owner: "reader@knife.test",
  },
  viewer: { id: PERSON },
} as unknown as Reached;

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: PROJECT,
  text,
});

const universe = (size: number): Chunk[] =>
  Array.from({ length: size }, (_unused, at) =>
    chunk(`chunk-${at}`, `Rule number ${at}.`),
  );

const finding = (chunkId: string, message: string): LintFinding => ({
  chunkId,
  length: 4,
  message,
  offset: 2,
  rule: "write-good",
  severity: "warning",
  tool: "textlint",
});

const clean: LintReport = {
  available: true,
  findings: [],
  tools: ["textlint"],
};

const agent = {
  chunksOf: vi.fn<(reached: Reached) => Promise<Chunk[]>>(),
  reach: vi.fn<(userId: string, project: string) => Promise<Reached>>(),
};

const lint = {
  lint: vi.fn<(items: Array<{ id: string }>) => Promise<LintReport>>(),
};

const tool = (): LintUniverseTool =>
  new LintUniverseTool(
    agent as unknown as AgentUniverseService,
    lint as unknown as LintService,
  );

describe("LintUniverseTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agent.reach.mockResolvedValue(reached);
    lint.lint.mockResolvedValue(clean);
  });

  /** A pass reads the whole universe; one request could not carry it. */
  it("reads every chunk, a batch of 500 per request", async () => {
    agent.chunksOf.mockResolvedValue(universe(1200));

    const said = await tool().run(PERSON, "night-audit", 20);

    expect(lint.lint).toHaveBeenCalledTimes(3);
    expect(lint.lint.mock.calls[2]?.[0]).toHaveLength(200);
    expect(said).toContain("The linters read all 1200 chunks.");
  });

  it("stops when the linters go away and says how far it got", async () => {
    agent.chunksOf.mockResolvedValue(universe(1200));
    lint.lint.mockResolvedValueOnce(clean).mockResolvedValue({
      available: false,
      findings: [],
      reason: "HTTP 502",
      tools: [],
    });

    const said = await tool().run(PERSON, "night-audit", 20);

    expect(lint.lint).toHaveBeenCalledTimes(2);
    expect(said).toContain(
      "The linters read 500 of 1200 chunks before stopping: HTTP 502.",
    );
  });

  /** The wording is judged once, not once per remark written on it. */
  it("gathers every remark on a chunk under that chunk", async () => {
    agent.chunksOf.mockResolvedValue([chunk("chunk-0", "A very good rule.")]);
    lint.lint.mockResolvedValue({
      available: true,
      findings: [
        finding("chunk-0", '"very" is a weasel word'),
        finding("chunk-0", "consider a stronger verb"),
      ],
      tools: ["proselint", "textlint"],
    });

    const said = await tool().run(PERSON, "night-audit", 20);

    expect(said).toContain("2 remarks on 1 chunk.");
    expect(said.match(/A very good rule\./g)).toHaveLength(1);
  });

  it("says nothing was read when the linters are offline from the start", async () => {
    agent.chunksOf.mockResolvedValue(universe(3));
    lint.lint.mockResolvedValue({
      available: false,
      findings: [],
      reason: "connect ECONNREFUSED",
      tools: [],
    });

    const said = await tool().run(PERSON, "night-audit", 20);

    expect(said).toContain(
      "The linters are offline: connect ECONNREFUSED. Nothing was read.",
    );
  });
});
