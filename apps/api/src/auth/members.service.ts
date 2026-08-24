import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/db/prisma.service";
import type { GoogleProfile } from "@/auth/google.service";
import type { Member, MemberRole as Role } from "@/generated/prisma/client";
import type { MemberRole, Teammate, Viewer } from "@knife/contract";

const asRole = (role: Role): MemberRole =>
  role === "OWNER" ? "owner" : "member";

/**
 * A team is made the moment someone signs in without one, and joined by being
 * invited by address: the invitation is a row with no Google account attached
 * yet, and signing in with that address claims it. Nothing is mailed, so there
 * is no invitation link to leak and no mail server to run.
 *
 * One person belongs to one team. Sitting in two would mean carrying a
 * "current team" through every request and every agent's pass, and getting
 * that wrong deletes a chunk in the wrong universe.
 */
@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(profile: GoogleProfile): Promise<Member> {
    const known = await this.prisma.member.findUnique({
      where: { googleSub: profile.sub },
    });
    if (known) {
      return known;
    }

    const invited = await this.prisma.member.findFirst({
      orderBy: { createdAt: "asc" },
      where: { email: profile.email, googleSub: null },
    });
    if (invited) {
      return this.prisma.member.update({
        data: { googleSub: profile.sub },
        where: { id: invited.id },
      });
    }

    return this.prisma.member.create({
      data: {
        email: profile.email,
        googleSub: profile.sub,
        organization: { create: { name: `${profile.name}'s team` } },
        role: "OWNER",
      },
    });
  }

  async byId(id: string): Promise<Member | null> {
    return this.prisma.member.findUnique({ where: { id } });
  }

  async viewer(member: Member): Promise<Viewer> {
    const organization = await this.prisma.organization.findUniqueOrThrow({
      select: { id: true, name: true },
      where: { id: member.organizationId },
    });

    return {
      email: member.email,
      memberId: member.id,
      organization,
      role: asRole(member.role),
    };
  }

  async teammates(organizationId: string): Promise<Teammate[]> {
    const members = await this.prisma.member.findMany({
      orderBy: { createdAt: "asc" },
      where: { organizationId },
    });

    return members.map((member) => ({
      email: member.email,
      joined: member.googleSub !== null,
      memberId: member.id,
      role: asRole(member.role),
    }));
  }

  async invite(organizationId: string, email: string): Promise<Teammate> {
    const address = email.trim().toLowerCase();

    const elsewhere = await this.prisma.member.findFirst({
      where: { email: address },
    });
    if (elsewhere) {
      throw new ConflictException(
        elsewhere.organizationId === organizationId
          ? `${address} is already here`
          : `${address} belongs to another team`,
      );
    }

    const member = await this.prisma.member.create({
      data: { email: address, organizationId, role: "MEMBER" },
    });

    return {
      email: member.email,
      joined: false,
      memberId: member.id,
      role: asRole(member.role),
    };
  }

  /** The last owner stays: a team nobody can invite into is a locked room. */
  async remove(organizationId: string, memberId: string): Promise<void> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) {
      throw new NotFoundException("No such teammate");
    }

    if (member.role === "OWNER") {
      const owners = await this.prisma.member.count({
        where: { organizationId, role: "OWNER" },
      });
      if (owners === 1) {
        throw new ConflictException("A team keeps at least one owner");
      }
    }

    await this.prisma.member.delete({ where: { id: memberId } });
  }
}
