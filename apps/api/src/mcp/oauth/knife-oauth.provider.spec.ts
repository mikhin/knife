import { createHash } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionService } from "@/auth/session.service";
import { KnifeOAuthProvider } from "@/mcp/oauth/knife-oauth.provider";
import { READ_SCOPE } from "@/mcp/oauth/knife-scopes";
import type { PrismaService } from "@/db/prisma.service";
import type { OAuthClientsStore } from "@/mcp/oauth/oauth-clients.store";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Response } from "express";

const PUBLIC_URL = "https://knife.example.com";
const RESOURCE = `${PUBLIC_URL}/mcp`;
const MEMBER = "6b1e2f3a-4c5d-4e6f-8a9b-0c1d2e3f4a5b";

type Args = Record<string, unknown>;

const prisma = {
  oAuthCode: {
    create: vi.fn<(args: Args) => Promise<Args>>(),
    delete: vi.fn<(args: Args) => Promise<Args>>(),
    findUnique: vi.fn<(args: Args) => Promise<Args | null>>(),
  },
  oAuthToken: {
    createMany: vi.fn<(args: Args) => Promise<{ count: number }>>(),
    findUnique: vi.fn<(args: Args) => Promise<Args | null>>(),
    update: vi.fn<(args: Args) => Promise<Args>>(),
    updateMany: vi.fn<(args: Args) => Promise<{ count: number }>>(),
  },
  user: {
    findUnique: vi.fn<(args: Args) => Promise<Args | null>>(),
  },
};

const client: OAuthClientInformationFull = {
  client_id: "an-agent",
  client_name: "Claude Code",
  redirect_uris: ["http://localhost:9999/callback"],
};

const config = new ConfigService({ PUBLIC_URL, SESSION_SECRET: "a-secret" });
const sessions = new SessionService(config);

const provider = (): KnifeOAuthProvider =>
  new KnifeOAuthProvider(
    config,
    {} as OAuthClientsStore,
    prisma as unknown as PrismaService,
    sessions,
  );

const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const storedCode = (over: Args = {}): Args => ({
  clientId: client.client_id,
  codeChallenge: "a-challenge",
  expiresAt: new Date(Date.now() + 30_000),
  memberId: MEMBER,
  redirectUri: client.redirect_uris[0],
  resource: RESOURCE,
  scopes: [READ_SCOPE],
  ...over,
});

const storedToken = (over: Args = {}): Args => ({
  clientId: client.client_id,
  expiresAt: new Date(Date.now() + 30_000),
  id: "a-row",
  kind: "ACCESS",
  memberId: MEMBER,
  resource: RESOURCE,
  revokedAt: null,
  scopes: [READ_SCOPE],
  ...over,
});

const responseSpy = (cookie: string | undefined) => {
  const redirects: string[] = [];
  return {
    redirect: (url: string) => redirects.push(url),
    redirects,
    req: {
      header: (name: string) =>
        name === "cookie" && cookie ? cookie : undefined,
      originalUrl: "/authorize?client_id=an-agent",
      query: {} as Record<string, unknown>,
    },
  };
};

const params = {
  codeChallenge: "a-challenge",
  redirectUri: client.redirect_uris[0] ?? "",
  scopes: [READ_SCOPE],
};

describe("KnifeOAuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: MEMBER });
  });

  describe("granting a pass", () => {
    it("sends a stranger to sign in first", async () => {
      const response = responseSpy(undefined);

      await provider().authorize(
        client,
        params,
        response as unknown as Response,
      );

      expect(response.redirects[0]).toContain("/api/auth/google?next=");
      expect(prisma.oAuthCode.create).not.toHaveBeenCalled();
    });

    /**
     * Being signed in is not consent. Without this, any page on the web could
     * walk an agent through this flow while the reader looked elsewhere.
     */
    it("asks a signed-in person before granting anything", async () => {
      const response = responseSpy(`knife_session=${sessions.sign(MEMBER)}`);

      await provider().authorize(
        client,
        params,
        response as unknown as Response,
      );

      expect(response.redirects[0]).toContain("/consent?to=");
      expect(prisma.oAuthCode.create).not.toHaveBeenCalled();
    });

    it("refuses a consent that was granted for another agent", async () => {
      const response = responseSpy(`knife_session=${sessions.sign(MEMBER)}`);
      response.req.query["knife_consent"] = sessions.sign(
        `another-agent:${MEMBER}`,
      );

      await provider().authorize(
        client,
        params,
        response as unknown as Response,
      );

      expect(response.redirects[0]).toContain("/consent?to=");
    });

    it("hands back a code once the person allowed it", async () => {
      const response = responseSpy(`knife_session=${sessions.sign(MEMBER)}`);
      const knife = provider();
      response.req.query["knife_consent"] = knife.consentFor(
        client.client_id,
        MEMBER,
      );

      await knife.authorize(client, params, response as unknown as Response);

      expect(prisma.oAuthCode.create).toHaveBeenCalledTimes(1);
      expect(response.redirects[0]).toContain("http://localhost:9999/callback");
      expect(response.redirects[0]).toContain("code=");
    });
  });

  describe("spending a code", () => {
    it("spends it once and never again", async () => {
      prisma.oAuthCode.findUnique.mockResolvedValueOnce(storedCode());
      prisma.oAuthCode.findUnique.mockResolvedValue(null);
      const knife = provider();

      await knife.exchangeAuthorizationCode(client, "a-code");

      expect(prisma.oAuthCode.delete).toHaveBeenCalledWith({
        where: { codeHash: hash("a-code") },
      });
      await expect(
        knife.exchangeAuthorizationCode(client, "a-code"),
      ).rejects.toThrow("Unknown authorization code");
    });

    it("refuses a code that belongs to another agent", async () => {
      prisma.oAuthCode.findUnique.mockResolvedValue(
        storedCode({ clientId: "somebody-else" }),
      );

      await expect(
        provider().exchangeAuthorizationCode(client, "a-code"),
      ).rejects.toThrow("Unknown authorization code");
    });

    it("refuses a code that has expired", async () => {
      prisma.oAuthCode.findUnique.mockResolvedValue(
        storedCode({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        provider().exchangeAuthorizationCode(client, "a-code"),
      ).rejects.toThrow("expired");
    });

    it("refuses a code redirected somewhere else", async () => {
      prisma.oAuthCode.findUnique.mockResolvedValue(storedCode());

      await expect(
        provider().exchangeAuthorizationCode(
          client,
          "a-code",
          undefined,
          "http://evil.example/callback",
        ),
      ).rejects.toThrow("another redirect");
    });
  });

  describe("checking a pass", () => {
    it("says which person the bearer is", async () => {
      prisma.oAuthToken.findUnique.mockResolvedValue(storedToken());

      const auth = await provider().verifyAccessToken("a-pass");

      expect(auth.extra).toMatchObject({ userId: MEMBER });
      expect(auth.scopes).toEqual([READ_SCOPE]);
    });

    it("refuses a pass that was taken away", async () => {
      prisma.oAuthToken.findUnique.mockResolvedValue(
        storedToken({ revokedAt: new Date() }),
      );

      await expect(provider().verifyAccessToken("a-pass")).rejects.toThrow(
        "Invalid access token",
      );
    });

    it("refuses a refresh token used as a pass", async () => {
      prisma.oAuthToken.findUnique.mockResolvedValue(
        storedToken({ kind: "REFRESH" }),
      );

      await expect(provider().verifyAccessToken("a-pass")).rejects.toThrow(
        "Invalid access token",
      );
    });

    /** RFC 8707 in one test: a genuine pass made out to somewhere else. */
    it("refuses a pass issued for another server", async () => {
      prisma.oAuthToken.findUnique.mockResolvedValue(
        storedToken({ resource: "https://someone-else.example/mcp" }),
      );

      await expect(provider().verifyAccessToken("a-pass")).rejects.toThrow(
        "another resource",
      );
    });
  });

  describe("refreshing", () => {
    it("kills the old refresh token as it issues the new one", async () => {
      prisma.oAuthToken.findUnique.mockResolvedValue(
        storedToken({ kind: "REFRESH" }),
      );

      const tokens = await provider().exchangeRefreshToken(client, "a-refresh");

      expect(prisma.oAuthToken.update).toHaveBeenCalledWith({
        data: { revokedAt: expect.any(Date) },
        where: { id: "a-row" },
      });
      expect(tokens.access_token).toBeTruthy();
      expect(tokens.refresh_token).toBeTruthy();
    });

    it("never widens what the pass was allowed to do", async () => {
      prisma.oAuthToken.findUnique.mockResolvedValue(
        storedToken({ kind: "REFRESH", scopes: [READ_SCOPE] }),
      );

      const tokens = await provider().exchangeRefreshToken(
        client,
        "a-refresh",
        ["knife:write"],
      );

      expect(tokens.scope).toBe("");
    });
  });
});
