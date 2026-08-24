import type { JSX } from "react";
import { signInUrl } from "@/stores/viewer-store";

/**
 * The whole of the front door. A universe belongs to a team now, and until
 * this page knows which one is asking it has nothing it can honestly show.
 */
export const SignIn = (): JSX.Element => (
  <main className="grid min-h-screen place-items-center p-6">
    <div className="w-full max-w-sm text-center">
      <h1 className="mb-2 text-lg font-semibold">Knife</h1>
      <p className="mb-6 text-sm text-faint">
        A universe of requirements you can navigate — yours and your
        team&apos;s.
      </p>
      <a
        className="inline-block rounded border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent"
        href={signInUrl()}
      >
        Sign in with Google
      </a>
    </div>
  </main>
);
