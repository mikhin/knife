import { Module } from "@nestjs/common";
import { AuthController } from "@/auth/auth.controller";
import { GoogleService } from "@/auth/google.service";
import { UsersService } from "@/auth/users.service";
import { SessionGuard } from "@/auth/session.guard";
import { SessionService } from "@/auth/session.service";

@Module({
  controllers: [AuthController],
  exports: [SessionGuard, SessionService, UsersService],
  providers: [GoogleService, SessionGuard, SessionService, UsersService],
})
export class AuthModule {}
