import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** A week: long enough not to nag, short enough that a stolen laptop expires. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "knife_session";

type Signed = { expiresAt: number; value: string };

const encode = (payload: Signed): string =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

const decode = (encoded: string): Signed | undefined => {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString(),
    );
    return typeof parsed === "object" &&
      parsed !== null &&
      "value" in parsed &&
      "expiresAt" in parsed &&
      typeof parsed.value === "string" &&
      typeof parsed.expiresAt === "number"
      ? { expiresAt: parsed.expiresAt, value: parsed.value }
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Signs the two short-lived things a browser carries: who is signed in, and
 * where a sign-in was headed. Both are signed rather than stored, so no table
 * grows with every visit — and both carry their own expiry, because a
 * signature alone would be valid forever.
 */
@Injectable()
export class SessionService {
  private readonly secret: Buffer;

  constructor(config: ConfigService) {
    const configured = config.get<string>("SESSION_SECRET", "").trim();

    if (configured) {
      this.secret = Buffer.from(configured);
    } else {
      this.secret = randomBytes(32);
      new Logger(SessionService.name).warn(
        "No SESSION_SECRET is set: signing with a secret that dies with this process, so everyone signs in again after a restart",
      );
    }
  }

  sign(value: string, ttlMs: number = SESSION_TTL_MS): string {
    const payload = encode({ expiresAt: Date.now() + ttlMs, value });
    return `${payload}.${this.digest(payload)}`;
  }

  /** Undefined for anything tampered with, expired, or simply not ours. */
  read(signed: string | undefined): string | undefined {
    const [payload, signature] = (signed ?? "").split(".");
    if (!payload || !signature || !this.matches(payload, signature)) {
      return undefined;
    }

    const decoded = decode(payload);
    return decoded && decoded.expiresAt > Date.now()
      ? decoded.value
      : undefined;
  }

  get maxAgeMs(): number {
    return SESSION_TTL_MS;
  }

  private digest(payload: string): string {
    return createHmac("sha256", this.secret)
      .update(payload)
      .digest("base64url");
  }

  private matches(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.digest(payload));
    const offered = Buffer.from(signature);
    return (
      expected.length === offered.length && timingSafeEqual(expected, offered)
    );
  }
}
