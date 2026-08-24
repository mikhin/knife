import { Module } from "@nestjs/common";
import { AuthController } from "@/auth/auth.controller";
import { GoogleService } from "@/auth/google.service";
import { MembersService } from "@/auth/members.service";
import { SessionGuard } from "@/auth/session.guard";
import { SessionService } from "@/auth/session.service";

@Module({
  controllers: [AuthController],
  exports: [MembersService, SessionGuard, SessionService],
  providers: [GoogleService, MembersService, SessionGuard, SessionService],
})
export class AuthModule {}
