import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleService } from "@/auth/google.service";
import { UsersService } from "@/auth/users.service";
import { SESSION_COOKIE, SessionService } from "@/auth/session.service";
import { SessionGuard } from "@/auth/session.guard";
import { SignedIn } from "@/auth/signed-in.decorator";
import type { User } from "@/generated/prisma/client";
import type { Connection, Viewer } from "@knife/contract";
import type { CookieOptions, Response } from "express";

/**
 * Ten minutes to walk through Google and come back. A minute was enough for
 * a person who is already signed in and clicks straight through; anyone who
 * has to pick an account, type a password and reach for a second factor ran
 * out of time and landed back on the sign-in screen with no explanation.
 */
const SIGN_IN_TTL_MS = 10 * 60 * 1000;

/**
 * Only a path inside this application is ever followed after a sign-in. An
 * absolute URL here would turn the sign-in into an open redirect, which is
 * how a convincing phishing page gets a knife.example.com address in front
 * of it.
 */
const landing = (next: string | undefined): string =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

/**
 * An agent's sign-in resumes on the server that issues passes, a person's on
 * the screen. In production both live behind one address and the difference
 * costs nothing; in development they are two ports, and sending an agent's
 * flow to the browser's port lands it on a page that does not exist.
 */
const forAgent = (next: string): boolean =>
  next.startsWith("/authorize") || next.startsWith("/consent");

@Controller("api/auth")
export class AuthController {
  private readonly publicUrl: string;
  private readonly webUrl: string;
  private readonly secure: boolean;

  constructor(
    config: ConfigService,
    private readonly google: GoogleService,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {
    this.publicUrl = config
      .get<string>("PUBLIC_URL", "http://localhost:3000")
      .replace(/\/$/, "");
    this.webUrl = config
      .get<string>("WEB_URL", "http://localhost:5173")
      .replace(/\/$/, "");
    this.secure = this.publicUrl.startsWith("https://");
  }

  @Get("google")
  start(
    @Query("next") next: string | undefined,
    @Res() response: Response,
  ): void {
    response.redirect(
      this.google.authorizeUrl(
        this.callbackUrl,
        this.sessions.sign(landing(next), SIGN_IN_TTL_MS),
      ),
    );
  }

  @Get("google/callback")
  async finish(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const next = this.sessions.read(state);

    if (!code || !next) {
      response.redirect(`${this.webUrl}/?signin=failed`);
      return;
    }

    const profile = await this.google.profileFor(code, this.callbackUrl);
    const user = await this.users.signIn(profile);

    response.cookie(
      SESSION_COOKIE,
      this.sessions.sign(user.id),
      this.cookieOptions,
    );
    response.redirect(
      `${forAgent(next) ? this.publicUrl : this.webUrl}${next}`,
    );
  }

  @Get("me")
  @UseGuards(SessionGuard)
  me(@SignedIn() viewer: User): Viewer {
    return this.users.viewer(viewer);
  }

  @Post("logout")
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions);
  }

  /** The address to hand an agent, said by the only party that knows it. */
  @Get("connection")
  @UseGuards(SessionGuard)
  connection(): Connection {
    return { mcpUrl: `${this.publicUrl}/mcp` };
  }

  private get callbackUrl(): string {
    return `${this.publicUrl}/api/auth/google/callback`;
  }

  private get cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      maxAge: this.sessions.maxAgeMs,
      path: "/",
      sameSite: "lax",
      secure: this.secure,
    };
  }
}
