import { atom } from "nanostores";

export const $failure = atom<string | undefined>(undefined);

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Ordered so that two actions in flight cannot erase each other: a success
 * clears only a message that was already on screen when it started, and a
 * failure always wins. Clearing on every call meant the slower of two
 * requests wiped the error the faster one had just reported.
 */
let clock = 0;
let failedAt = 0;

export const attempt = (action: Promise<unknown>): void => {
  const startedAt = clock + 1;
  clock = startedAt;

  const succeeded = (): boolean => failedAt < startedAt;

  const clear = (): undefined => {
    if (succeeded()) {
      $failure.set(undefined);
    }
    return undefined;
  };

  const report = (error: unknown): undefined => {
    clock += 1;
    failedAt = clock;
    $failure.set(describe(error));
    return undefined;
  };

  action.then(clear, report);
};
