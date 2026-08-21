import { atom } from "nanostores";

export const $failure = atom<string | undefined>(undefined);

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Anything the user set in motion says so when it fails. A rejected promise
 * dropped with `void` leaves the screen looking as if the click worked.
 */
export const attempt = (action: Promise<unknown>): void => {
  $failure.set(undefined);
  action.catch((error: unknown) => {
    $failure.set(describe(error));
  });
};
