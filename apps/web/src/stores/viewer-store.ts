import { atom } from "nanostores";
import { authApi } from "@/api/auth-api";
import type { Connection, Teammate, Viewer } from "@knife/contract";

export const $viewer = atom<undefined | Viewer>(undefined);
export const $team = atom<Teammate[]>([]);
export const $connection = atom<Connection | undefined>(undefined);

/**
 * Undefined means "not asked yet" rather than "signed out" — without the
 * difference the sign-in screen flashes in front of everyone who is already
 * signed in, once per reload.
 */
export const $asked = atom(false);

export const loadViewer = async (): Promise<void> => {
  try {
    $viewer.set(await authApi.me());
  } catch {
    $viewer.set(undefined);
  } finally {
    $asked.set(true);
  }
};

export const loadTeam = async (): Promise<void> => {
  const [team, connection] = await Promise.all([
    authApi.team(),
    authApi.connection(),
  ]);
  $team.set(team);
  $connection.set(connection);
};

export const inviteTeammate = async (email: string): Promise<void> => {
  await authApi.invite(email);
  await loadTeam();
};

export const removeTeammate = async (memberId: string): Promise<void> => {
  await authApi.removeTeammate(memberId);
  await loadTeam();
};

export const signOut = async (): Promise<void> => {
  await authApi.logout();
  $viewer.set(undefined);
  $team.set([]);
  window.location.assign("/");
};

export const signInUrl = (): string =>
  `/api/auth/google?next=${encodeURIComponent(window.location.pathname)}`;
