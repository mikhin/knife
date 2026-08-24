import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { cookieFrom } from "@/auth/cookie";
import { SESSION_COOKIE, SessionService } from "@/auth/session.service";
import { PrismaService } from "@/db/prisma.service";
import { READ_SCOPE } from "@/mcp/oauth/knife-scopes";
import { OAuthClientsStore } from "@/mcp/oauth/oauth-clients.store";
import {
  InvalidGrantError,
  InvalidTargetError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Response } from "express";

/** Long enough to travel through a browser redirect, short enough to be dull. */
const CODE_TTL_MS = 60 * 1000;
const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CONSENT_TTL_MS = 5 * 60 * 1000;

export const CONSENT_PARAM = "knife_consent";

const secret = (): string => randomBytes(32).toString("base64url");

/** Stored hashed: the tables are then worthless to whoever reads them. */
const fingerprint = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const seconds = (date: Date): number => Math.floor(date.getTime() / 1000);

/**
 * The pass an agent carries into a universe. Google says which person is at
 * the keyboard; this says what that person let an agent do, and it names this
 * server as the only place the pass is worth anything.
 *
 * Passes are opaque — a random string that means nothing except as a row here.
 * A self-describing token would keep working after it was taken away, and
 * taking one away is the only defence left once an agent misbehaves.
 */
@Injectable()
export class KnifeOAuthProvider implements OAuthServerProvider {
  private readonly resource: string;

  constructor(
    config: ConfigService,
    private readonly clients: OAuthClientsStore,
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {
    this.resource = `${config.get<string>("PUBLIC_URL", "http://localhost:3000").replace(/\/$/, "")}/mcp`;
  }

  get clientsStore(): OAuthClientsStore {
    return this.clients;
  }

  /** Signs "this person allowed this agent", handed back through the browser. */
  consentFor(clientId: string, memberId: string): string {
    return this.sessions.sign(`${clientId}:${memberId}`, CONSENT_TTL_MS);
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const request = res.req;
    const memberId = this.sessions.read(cookieFrom(request, SESSION_COOKIE));
    const returning = encodeURIComponent(request.originalUrl);

    if (!memberId) {
      res.redirect(`/api/auth/google?next=${returning}`);
      return;
    }

    const offered = request.query[CONSENT_PARAM];
    const allowed =
      typeof offered === "string" &&
      this.sessions.read(offered) === `${client.client_id}:${memberId}`;

    if (!allowed) {
      res.redirect(`/consent?to=${returning}`);
      return;
    }

    const code = secret();
    const scopes = params.scopes?.length ? params.scopes : [READ_SCOPE];

    await this.prisma.oAuthCode.create({
      data: {
        clientId: client.client_id,
        codeChallenge: params.codeChallenge,
        codeHash: fingerprint(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        memberId,
        redirectUri: params.redirectUri,
        resource: params.resource?.href ?? null,
        scopes,
      },
    });

    const target = new URL(params.redirectUri);
    target.searchParams.set("code", code);
    if (params.state) {
      target.searchParams.set("state", params.state);
    }
    res.redirect(target.href);
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const code = await this.prisma.oAuthCode.findUnique({
      where: { codeHash: fingerprint(authorizationCode) },
    });

    if (!code || code.clientId !== client.client_id) {
      throw new InvalidGrantError("Unknown authorization code");
    }
    if (code.expiresAt.getTime() < Date.now()) {
      throw new InvalidGrantError("This authorization code has expired");
    }

    return code.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const codeHash = fingerprint(authorizationCode);
    const code = await this.prisma.oAuthCode.findUnique({
      where: { codeHash },
    });

    if (!code || code.clientId !== client.client_id) {
      throw new InvalidGrantError("Unknown authorization code");
    }

    /** Spent on first use, valid or not: a replayed code is never a second pass. */
    await this.prisma.oAuthCode.delete({ where: { codeHash } });

    if (code.expiresAt.getTime() < Date.now()) {
      throw new InvalidGrantError("This authorization code has expired");
    }
    if (redirectUri && redirectUri !== code.redirectUri) {
      throw new InvalidGrantError("This code was issued for another redirect");
    }
    if (resource && code.resource && resource.href !== code.resource) {
      throw new InvalidTargetError("This code was issued for another resource");
    }

    return this.issue(
      client.client_id,
      code.memberId,
      code.scopes,
      code.resource,
    );
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const stored = await this.prisma.oAuthToken.findUnique({
      where: { tokenHash: fingerprint(refreshToken) },
    });

    if (
      !stored ||
      stored.kind !== "REFRESH" ||
      stored.clientId !== client.client_id ||
      stored.revokedAt !== null ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new InvalidGrantError("Unknown refresh token");
    }

    /** Rotated: the old one dies here, so a copied token stops working. */
    await this.prisma.oAuthToken.update({
      data: { revokedAt: new Date() },
      where: { id: stored.id },
    });

    const narrowed = scopes?.length
      ? stored.scopes.filter((scope) => scopes.includes(scope))
      : stored.scopes;

    return this.issue(
      client.client_id,
      stored.memberId,
      narrowed,
      resource?.href ?? stored.resource,
    );
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const stored = await this.prisma.oAuthToken.findUnique({
      where: { tokenHash: fingerprint(token) },
    });

    if (
      !stored ||
      stored.kind !== "ACCESS" ||
      stored.revokedAt !== null ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new InvalidTokenError("Invalid access token");
    }

    /**
     * A pass made out to somewhere else is refused even when it is genuine:
     * that is the whole of RFC 8707, and without it a token from another
     * service would open this one.
     */
    if (stored.resource && stored.resource !== this.resource) {
      throw new InvalidTokenError("This token was issued for another resource");
    }

    const user = await this.prisma.user.findUnique({
      select: { id: true },
      where: { id: stored.memberId },
    });
    if (!user) {
      throw new InvalidTokenError("The person behind this token is gone");
    }

    return {
      clientId: stored.clientId,
      expiresAt: seconds(stored.expiresAt),
      extra: { userId: user.id },
      resource: new URL(this.resource),
      scopes: stored.scopes,
      token,
    };
  }

  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    await this.prisma.oAuthToken.updateMany({
      data: { revokedAt: new Date() },
      where: {
        clientId: client.client_id,
        revokedAt: null,
        tokenHash: fingerprint(request.token),
      },
    });
  }

  private async issue(
    clientId: string,
    memberId: string,
    scopes: string[],
    resource: null | string,
  ): Promise<OAuthTokens> {
    const accessToken = secret();
    const refreshToken = secret();
    const now = Date.now();

    await this.prisma.oAuthToken.createMany({
      data: [
        {
          clientId,
          expiresAt: new Date(now + ACCESS_TTL_MS),
          kind: "ACCESS",
          memberId,
          resource,
          scopes,
          tokenHash: fingerprint(accessToken),
        },
        {
          clientId,
          expiresAt: new Date(now + REFRESH_TTL_MS),
          kind: "REFRESH",
          memberId,
          resource,
          scopes,
          tokenHash: fingerprint(refreshToken),
        },
      ],
    });

    return {
      access_token: accessToken,
      expires_in: Math.floor(ACCESS_TTL_MS / 1000),
      refresh_token: refreshToken,
      scope: scopes.join(" "),
      token_type: "Bearer",
    };
  }
}
