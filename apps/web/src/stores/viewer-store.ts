import { atom } from "nanostores";
import { authApi } from "@/api/auth-api";
import type { Connection, Viewer } from "@knife/contract";

export const $viewer = atom<undefined | Viewer>(undefined);
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

export const loadConnection = async (): Promise<void> => {
  $connection.set(await authApi.connection());
};

export const signOut = async (): Promise<void> => {
  await authApi.logout();
  $viewer.set(undefined);
  window.location.assign("/");
};

export const signInUrl = (): string =>
  `/api/auth/google?next=${encodeURIComponent(window.location.pathname)}`;
