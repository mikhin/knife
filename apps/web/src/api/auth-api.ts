import { request } from "@/api/request";
import type { Connection, Teammate, Viewer } from "@knife/contract";

export const authApi = {
  connection: (): Promise<Connection> => request("/api/auth/connection"),

  invite: (email: string): Promise<Teammate> =>
    request("/api/auth/team", {
      body: JSON.stringify({ email }),
      method: "POST",
    }),

  logout: (): Promise<void> => request("/api/auth/logout", { method: "POST" }),

  me: (): Promise<Viewer> => request("/api/auth/me"),

  removeTeammate: (memberId: string): Promise<void> =>
    request(`/api/auth/team/${memberId}`, { method: "DELETE" }),

  team: (): Promise<Teammate[]> => request("/api/auth/team"),
} as const;
