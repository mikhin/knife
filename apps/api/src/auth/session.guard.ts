import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { cookieFrom } from "@/auth/cookie";
import { UsersService } from "@/auth/users.service";
import { SESSION_COOKIE, SessionService } from "@/auth/session.service";
import type { User } from "@/generated/prisma/client";
import type { Request } from "express";

export type SignedInRequest = Request & { user?: User };

/**
 * Everything a browser reaches goes through here. Until this existed, the
 * universe belonged to whoever knew the address.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const userId = this.sessions.read(cookieFrom(request, SESSION_COOKIE));

    if (!userId) {
      throw new UnauthorizedException("Sign in first");
    }

    const user = await this.users.byId(userId);
    if (!user) {
      throw new UnauthorizedException("This account is gone");
    }

    request.user = user;
    return true;
  }
}
