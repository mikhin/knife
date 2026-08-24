import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "@/auth/session.guard";
import { SignedIn } from "@/auth/signed-in.decorator";
import { SessionService } from "@/auth/session.service";
import { ConsentDto } from "@/mcp/oauth/consent.dto";
import { READ_SCOPE, SCOPE_MEANING } from "@/mcp/oauth/knife-scopes";
import {
  CONSENT_PARAM,
  KnifeOAuthProvider,
} from "@/mcp/oauth/knife-oauth.provider";
import { OAuthClientsStore } from "@/mcp/oauth/oauth-clients.store";
import type { User } from "@/generated/prisma/client";
import type { Response } from "express";

const TICKET_TTL_MS = 5 * 60 * 1000;

const escape = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] ?? character,
  );

/** Only ever back into this server's own authorize step. */
const asAuthorizeUrl = (to: string): URL => {
  if (!to.startsWith("/authorize?")) {
    throw new BadRequestException("This is not an authorization in progress");
  }
  return new URL(to, "http://knife.invalid");
};

const page = (
  agent: string,
  person: string,
  scopes: string[],
  to: string,
  ticket: string,
): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect an agent — Knife</title>
<style>
  :root { color-scheme: light dark; --ink: #14171a; --paper: #fbfaf8; --faint: #6b7076; --line: #dcd8d2; --accent: #b4471f; }
  @media (prefers-color-scheme: dark) { :root { --ink: #e9e6e1; --paper: #16181a; --faint: #8b9096; --line: #2c2f33; --accent: #e8865c; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--paper); color: var(--ink);
         font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; }
  main { max-width: 30rem; width: 100%; }
  h1 { font-size: 1.25rem; margin: 0 0 1rem; font-weight: 600; }
  p { margin: 0 0 1rem; }
  strong { font-weight: 600; }
  ul { margin: 0 0 1.5rem; padding-left: 1.1rem; }
  li { margin-bottom: .35rem; }
  .team { color: var(--faint); }
  .row { display: flex; gap: .75rem; align-items: center; }
  button { font: inherit; padding: .55rem 1.1rem; border-radius: .4rem; cursor: pointer; border: 1px solid var(--line); background: transparent; color: inherit; }
  button.allow { background: var(--accent); border-color: var(--accent); color: #fff; }
  form { display: contents; }
</style>
</head>
<body>
<main>
  <h1>${escape(agent)} wants into your universe</h1>
  <p class="team">Signed in as <strong>${escape(person)}</strong></p>
  <p>If you allow it, this agent will be able to:</p>
  <ul>${scopes
    .map((scope) => `<li>${escape(SCOPE_MEANING[scope] ?? scope)}</li>`)
    .join("")}</ul>
  <div class="row">
    <form method="post" action="/consent">
      <input type="hidden" name="to" value="${escape(to)}">
      <input type="hidden" name="ticket" value="${escape(ticket)}">
      <button class="allow" type="submit" name="allow" value="yes">Allow</button>
      <button type="submit" name="allow" value="no">Refuse</button>
    </form>
  </div>
</main>
</body>
</html>`;

/**
 * The one screen a person sees when an agent asks for a universe. Without it,
 * being signed in would be enough for any page on the web to walk an agent
 * through this flow while the reader looked elsewhere.
 */
@Controller("consent")
@UseGuards(SessionGuard)
export class ConsentController {
  constructor(
    private readonly clients: OAuthClientsStore,
    private readonly oauth: KnifeOAuthProvider,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  @Header("cache-control", "no-store")
  @Header("content-type", "text/html; charset=utf-8")
  async ask(
    @SignedIn() viewer: User,
    @Query("to") to: string | undefined,
  ): Promise<string> {
    const authorize = asAuthorizeUrl(to ?? "");
    const clientId = authorize.searchParams.get("client_id") ?? "";
    const client = await this.clients.getClient(clientId);

    if (!client) {
      throw new BadRequestException("No such agent");
    }

    const scopes = (authorize.searchParams.get("scope") ?? READ_SCOPE)
      .split(" ")
      .filter(Boolean);

    return page(
      client.client_name ?? "An agent",
      viewer.email,
      scopes,
      to ?? "",
      this.sessions.sign(`${viewer.id}:${to ?? ""}`, TICKET_TTL_MS),
    );
  }

  @Post()
  decide(
    @SignedIn() viewer: User,
    @Body() dto: ConsentDto,
    @Res() response: Response,
  ): void {
    const authorize = asAuthorizeUrl(dto.to);

    /** The ticket is what makes this a decision and not a link someone sent. */
    if (this.sessions.read(dto.ticket) !== `${viewer.id}:${dto.to}`) {
      throw new UnauthorizedException("This request did not start here");
    }

    if (dto.allow !== "yes") {
      response.redirect("/consent/refused");
      return;
    }

    const clientId = authorize.searchParams.get("client_id") ?? "";
    authorize.searchParams.set(
      CONSENT_PARAM,
      this.oauth.consentFor(clientId, viewer.id),
    );

    response.redirect(`${authorize.pathname}${authorize.search}`);
  }

  @Get("refused")
  @Header("content-type", "text/html; charset=utf-8")
  refused(): string {
    return `<!doctype html><meta charset="utf-8"><title>Refused — Knife</title>
<p style="font: 16px ui-sans-serif, system-ui, sans-serif; padding: 2rem">
Nothing was granted. You can close this tab.</p>`;
  }
}
