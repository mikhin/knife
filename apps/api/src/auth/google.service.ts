import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROFILE_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleProfile = {
  email: string;
  name: string;
  sub: string;
};

const asProfile = (body: unknown): GoogleProfile => {
  const claims = body as {
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
    sub?: unknown;
  };

  if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
    throw new ServiceUnavailableException("Google answered without an account");
  }

  /**
   * An unverified address would let anyone claim a teammate's invitation by
   * signing up with their email at a provider that never checked it.
   */
  if (claims.email_verified === false) {
    throw new ServiceUnavailableException("This Google address is unverified");
  }

  return {
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : claims.email,
    sub: claims.sub,
  };
};

/**
 * Google answers one question — which address is this — and nothing else is
 * asked of it. It never issues the pass an agent carries: that pass has to
 * name this server as its audience, and Google would name itself.
 */
@Injectable()
export class GoogleService {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>("GOOGLE_CLIENT_ID", "").trim();
    this.clientSecret = config.get<string>("GOOGLE_CLIENT_SECRET", "").trim();
  }

  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  authorizeUrl(redirectUri: string, state: string): string {
    this.assertConfigured();

    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  async profileFor(code: string, redirectUri: string): Promise<GoogleProfile> {
    this.assertConfigured();

    const tokens = await fetch(TOKEN_URL, {
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });

    if (!tokens.ok) {
      throw new ServiceUnavailableException("Google refused the sign-in");
    }

    const { access_token: accessToken } = (await tokens.json()) as {
      access_token?: string;
    };
    if (!accessToken) {
      throw new ServiceUnavailableException("Google returned no access token");
    }

    const profile = await fetch(PROFILE_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!profile.ok) {
      throw new ServiceUnavailableException(
        "Google would not say who signed in",
      );
    }

    return asProfile(await profile.json());
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        "Signing in is closed: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set",
      );
    }
  }
}
