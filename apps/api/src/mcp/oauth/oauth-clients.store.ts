import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthClient } from "@/generated/prisma/client";

const toClient = (client: OAuthClient): OAuthClientInformationFull => ({
  client_id: client.id,
  client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
  client_name: client.name,
  grant_types: ["authorization_code", "refresh_token"],
  redirect_uris: client.redirectUris,
  response_types: ["code"],
  ...(client.scopes.length > 0 ? { scope: client.scopes.join(" ") } : {}),
});

/**
 * Agents register themselves the first time they knock, which is what lets a
 * person add this server by its address alone. Registration grants nothing:
 * a client is a name and a set of redirect targets, and every pass it later
 * carries was still handed over by a signed-in human.
 *
 * Public clients only — no secret is issued or kept. Claude Code and its kin
 * run on the reader's own machine, where a secret could not stay one, and
 * PKCE is what actually ties a code to the client that asked for it.
 */
@Injectable()
export class OAuthClientsStore implements OAuthRegisteredClientsStore {
  constructor(private readonly prisma: PrismaService) {}

  async getClient(
    clientId: string,
  ): Promise<OAuthClientInformationFull | undefined> {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { id: clientId },
    });
    return client ? toClient(client) : undefined;
  }

  async registerClient(
    client: Omit<
      OAuthClientInformationFull,
      "client_id" | "client_id_issued_at"
    >,
  ): Promise<OAuthClientInformationFull> {
    const stored = await this.prisma.oAuthClient.create({
      data: {
        id: randomBytes(16).toString("hex"),
        name: client.client_name ?? "An agent",
        redirectUris: client.redirect_uris,
        scopes: client.scope?.split(" ").filter(Boolean) ?? [],
      },
    });

    return toClient(stored);
  }
}
