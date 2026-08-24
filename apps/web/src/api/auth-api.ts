import { request } from "@/api/request";
import type { Connection, Viewer } from "@knife/contract";

export const authApi = {
  connection: (): Promise<Connection> => request("/api/auth/connection"),

  logout: (): Promise<void> => request("/api/auth/logout", { method: "POST" }),

  me: (): Promise<Viewer> => request("/api/auth/me"),
} as const;
