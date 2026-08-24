import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FindDuplicatesTool } from "@/mcp/find-duplicates.tool";
import { McpController } from "@/mcp/mcp.controller";
import { McpService } from "@/mcp/mcp.service";
import { READ_SCOPE, WRITE_SCOPE } from "@/mcp/oauth/knife-scopes";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { NextFunction, Request, Response } from "express";

const PERSON = "3c9f1e2d-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const SOMEBODY_ELSE = "9d8c7b6a-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const duplicates = {
  run: vi
    .fn<
      (
        userId: string,
        project: string,
        level: string,
        limit: number,
      ) => Promise<string>
    >()
    .mockResolvedValue('Project "night-audit" holds 2 chunks.'),
};

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

const callDuplicates = (app: INestApplication, args: object) =>
  speak(app, {
    id: 1,
    jsonrpc: "2.0",
    method: "tools/call",
    params: { arguments: args, name: "find_duplicates" },
  });

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
        { provide: FindDuplicatesTool, useValue: duplicates },
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

  afterAll(async () => {
    await app.close();
  });

  it("offers the tool it has", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    const response = await speak(app, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/list",
    });

    expect(response.body).toMatchObject({
      result: { tools: [{ name: "find_duplicates" }] },
    });
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

  it("has nothing to stream on its own", async () => {
    carrying = pass([READ_SCOPE], PERSON);

    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    ).get("/mcp");

    expect(response.status).toBe(405);
  });
});
