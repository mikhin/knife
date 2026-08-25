import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AddChunksTool } from "@/mcp/add-chunks.tool";
import { DeleteChunkTool } from "@/mcp/delete-chunk.tool";
import { FindDanglingTool } from "@/mcp/find-dangling.tool";
import { FindDuplicatesTool } from "@/mcp/find-duplicates.tool";
import { GetChunkTool } from "@/mcp/get-chunk.tool";
import { GetWordTool } from "@/mcp/get-word.tool";
import { LintUniverseTool } from "@/mcp/lint-universe.tool";
import { ListChunksTool } from "@/mcp/list-chunks.tool";
import { ListWordsTool } from "@/mcp/list-words.tool";
import { SearchChunksTool } from "@/mcp/search-chunks.tool";
import { McpController } from "@/mcp/mcp.controller";
import { McpService } from "@/mcp/mcp.service";
import { READ_SCOPE, WRITE_SCOPE } from "@/mcp/oauth/knife-scopes";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { NextFunction, Request, Response } from "express";

const PERSON = "3c9f1e2d-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const SOMEBODY_ELSE = "9d8c7b6a-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const CHUNK = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

/** Every tool is a run() answering text; what it does is tested elsewhere. */
const standIn = (answer: string) => ({
  run: vi.fn<(...args: never[]) => Promise<string>>().mockResolvedValue(answer),
});

const duplicates = standIn('Project "night-audit" holds 2 chunks.');
const chunks = standIn('Project "night-audit" holds 2 chunks.');
const dangling = standIn("Nothing hangs: every chunk shares a word.");
const linters = standIn("Nothing was written on.");
const adding = standIn('Added 3 chunks to "night-audit".');
const oneChunk = standIn('chunk-1 in "night-audit", arrived 2026-08-21.');
const searching = standIn('"refund" — 2 chunks.');
const words = standIn('Project "night-audit" holds 2 chunks, 9 words.');
const oneWord = standIn('"refund" in "night-audit": 2 chunks.');
const deleting = standIn('Deleted from "night-audit". This cannot be undone.');

/** Stands in for the pass the bearer middleware would have checked. */
let carrying: AuthInfo | undefined;

const pass = (scopes: string[], userId: string): AuthInfo => ({
  clientId: "an-agent",
  extra: { userId },
  scopes,
  token: "a-pass",
});

const speak = (app: INestApplication, body: object) =>
  request(app.getHttpServer() as Parameters<typeof request>[0])
    .post("/mcp")
    .set("accept", "application/json, text/event-stream")
    .send(body);

const callTool = (app: INestApplication, name: string, args: object) =>
  speak(app, {
    id: 1,
    jsonrpc: "2.0",
    method: "tools/call",
    params: { arguments: args, name },
  });

const callDuplicates = (app: INestApplication, args: object) =>
  callTool(app, "find_duplicates", args);

const said = (body: unknown): string =>
  (body as { result?: { content?: Array<{ text: string }> } }).result
    ?.content?.[0]?.text ?? "";

describe("mcp door", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        McpService,
        { provide: AddChunksTool, useValue: adding },
        { provide: DeleteChunkTool, useValue: deleting },
        { provide: FindDanglingTool, useValue: dangling },
        { provide: FindDuplicatesTool, useValue: duplicates },
        { provide: GetChunkTool, useValue: oneChunk },
        { provide: GetWordTool, useValue: oneWord },
        { provide: LintUniverseTool, useValue: linters },
        { provide: ListChunksTool, useValue: chunks },
        { provide: ListWordsTool, useValue: words },
        { provide: SearchChunksTool, useValue: searching },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((incoming: Request, _response: Response, next: NextFunction) => {
      const carrier = incoming as Request & { auth?: AuthInfo };
      if (carrying) {
        carrier.auth = carrying;
      } else {
        delete carrier.auth;
      }
      next();
    });
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("offers every tool it has", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    const response = await speak(app, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/list",
    });
    const offered = (
      response.body as { result: { tools: Array<{ name: string }> } }
    ).result.tools.map((tool) => tool.name);

    expect(offered).toEqual([
      "list_chunks",
      "get_chunk",
      "search_chunks",
      "list_words",
      "get_word",
      "find_duplicates",
      "find_dangling_chunks",
      "lint_universe",
      "add_chunks",
      "delete_chunk",
    ]);
  });

  /**
   * The person comes from the pass. An agent that could name one would only
   * have to guess a uuid to read a universe belonging to a stranger.
   */
  it("answers for the person the pass names, not the one asked for", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    const response = await callDuplicates(app, {
      project: "night-audit",
      userId: SOMEBODY_ELSE,
    });

    expect(duplicates.run).toHaveBeenCalledWith(
      PERSON,
      "night-audit",
      "almost",
      20,
    );
    expect(said(response.body)).toContain("night-audit");
  });

  it("turns away a call carrying no pass", async () => {
    carrying = undefined;

    const response = await callDuplicates(app, { project: "night-audit" });

    expect(said(response.body)).toContain("This pass names nobody");
  });

  /** Reading and deleting are separate grants, and this is where that begins. */
  it("turns away a pass that was never allowed to read", async () => {
    carrying = pass([WRITE_SCOPE], PERSON);

    const response = await callDuplicates(app, { project: "night-audit" });

    expect(said(response.body)).toContain("does not allow knife:read");
  });

  it("refuses to delete for a pass allowed only to read", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    const response = await callTool(app, "delete_chunk", {
      id: CHUNK,
      project: "night-audit",
    });

    expect(deleting.run).not.toHaveBeenCalled();
    expect(said(response.body)).toContain("does not allow knife:write");
  });

  /** The second grant on its own is one this server issued: it opens the door. */
  it("deletes for a pass allowed only to delete", async () => {
    carrying = pass([WRITE_SCOPE], PERSON);

    const response = await callTool(app, "delete_chunk", {
      id: CHUNK,
      project: "night-audit",
    });

    expect(deleting.run).toHaveBeenCalledWith(PERSON, "night-audit", CHUNK);
    expect(said(response.body)).toContain("cannot be undone");
  });

  it("leaves the format of added text to be guessed when nobody says", async () => {
    carrying = pass([READ_SCOPE, WRITE_SCOPE], PERSON);

    await callTool(app, "add_chunks", {
      project: "night-audit",
      text: "A refund request must be submitted within 48 hours.",
    });

    expect(adding.run).toHaveBeenCalledWith(
      PERSON,
      "night-audit",
      "A refund request must be submitted within 48 hours.",
      undefined,
      20,
    );
  });

  it("reads a window of the universe from where it was asked", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    await callTool(app, "list_chunks", {
      from: 40,
      limit: 20,
      project: "night-audit",
    });

    expect(chunks.run).toHaveBeenCalledWith(PERSON, "night-audit", {
      from: 40,
      limit: 20,
    });
  });

  it("reads one chunk with its words for a reader", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    await callTool(app, "get_chunk", { id: CHUNK, project: "night-audit" });

    expect(oneChunk.run).toHaveBeenCalledWith(PERSON, "night-audit", CHUNK, 40);
  });

  /** Слово приходит как написано, приведение к основе живёт в туле. */
  it("hands a word to the tool as it was written", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    await callTool(app, "get_word", {
      project: "night-audit",
      word: "refunds",
    });

    expect(oneWord.run).toHaveBeenCalledWith(
      PERSON,
      "night-audit",
      "refunds",
      20,
    );
  });

  it("searches a universe for a reader", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    await callTool(app, "search_chunks", {
      project: "night-audit",
      query: "refund 48",
    });

    expect(searching.run).toHaveBeenCalledWith(
      PERSON,
      "night-audit",
      "refund 48",
      20,
    );
  });

  it("reads the vocabulary from where it was asked", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    await callTool(app, "list_words", { from: 100, project: "night-audit" });

    expect(words.run).toHaveBeenCalledWith(PERSON, "night-audit", {
      from: 100,
      limit: 50,
    });
  });

  it("runs the linters over the whole universe for a reader", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    await callTool(app, "lint_universe", { project: "night-audit" });

    expect(linters.run).toHaveBeenCalledWith(PERSON, "night-audit", 20);
  });

  it("names the hanging chunks for a reader", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    await callTool(app, "find_dangling_chunks", { project: "night-audit" });

    expect(dangling.run).toHaveBeenCalledWith(PERSON, "night-audit", 20);
  });

  it("has nothing to stream on its own", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    ).get("/mcp");

    expect(response.status).toBe(405);
  });
});
