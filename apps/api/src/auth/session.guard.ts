import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { cookieFrom } from "@/auth/cookie";
import { MembersService } from "@/auth/members.service";
import { SESSION_COOKIE, SessionService } from "@/auth/session.service";
import type { Member } from "@/generated/prisma/client";
import type { Request } from "express";

export type SignedInRequest = Request & { member?: Member };

/**
 * Everything a browser reaches goes through here. Until this existed, the
 * universe belonged to whoever knew the address.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly members: MembersService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const memberId = this.sessions.read(cookieFrom(request, SESSION_COOKIE));

    if (!memberId) {
      throw new UnauthorizedException("Sign in first");
    }

    const member = await this.members.byId(memberId);
    if (!member) {
      throw new UnauthorizedException("This account is gone");
    }

    request.member = member;
    return true;
  }
}
