import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { SignedInRequest } from "@/auth/session.guard";
import type { User } from "@/generated/prisma/client";

/** Only ever present behind SessionGuard, which is what puts it there. */
export const SignedIn = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    if (!request.user) {
      throw new Error("SignedIn used outside SessionGuard");
    }
    return request.user;
  },
);
