import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LintService } from "@/lint/lint.service";

const config = {
  get: <T>(key: string, fallback: T): T =>
    key === "LINTERS_URL" ? ("http://linters:8081" as T) : fallback,
};

describe("LintService", () => {
  let lint: LintService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LintService, { provide: ConfigService, useValue: config }],
    }).compile();

    lint = moduleRef.get(LintService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("says the linters are offline rather than failing the screen", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error("connect ECONNREFUSED")),
    );

    await expect(lint.lint([{ id: "1", text: "A rule." }])).resolves.toEqual({
      available: false,
      findings: [],
      reason: "connect ECONNREFUSED",
      tools: [],
    });
  });

  it("passes findings through untouched", async () => {
    const payload = {
      available: true,
      findings: [
        {
          chunkId: "1",
          length: 4,
          message: '"very" is a weasel word',
          offset: 10,
          rule: "write-good",
          severity: "warning",
          tool: "textlint",
        },
      ],
      tools: ["textlint"],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue({
        json: () => Promise.resolve(payload),
        ok: true,
      } as Response),
    );

    await expect(
      lint.lint([{ id: "1", text: "A very good rule." }]),
    ).resolves.toEqual(payload);
  });

  it("treats a linter error response as offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        status: 502,
      } as Response),
    );

    await expect(lint.health()).resolves.toEqual({
      available: false,
      reason: "HTTP 502",
      tools: [],
    });
  });
});
