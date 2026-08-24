import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { GoogleProfile } from "@/auth/google.service";
import type { User } from "@/generated/prisma/client";
import type { Viewer } from "@knife/contract";

/**
 * A person is their address. Signing in with an address that was invited to
 * a project is what claims the invitation — nothing is mailed, and there is
 * no link that could be forwarded to somebody else.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(profile: GoogleProfile): Promise<User> {
    const known = await this.prisma.user.findUnique({
      where: { googleSub: profile.sub },
    });
    if (known) {
      return known;
    }

    /**
     * The address may already be here as somebody's guest, invited before it
     * ever signed in. That row is the person: taking it over rather than
     * making a second one is what turns the invitation into access.
     */
    return this.prisma.user.upsert({
      create: { email: profile.email, googleSub: profile.sub },
      update: { googleSub: profile.sub },
      where: { email: profile.email },
    });
  }

  async byId(id: string): Promise<null | User> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  viewer(user: User): Viewer {
    return { email: user.email, userId: user.id };
  }
}
