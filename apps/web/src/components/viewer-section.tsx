import { useStore } from "@nanostores/react";
import { type JSX, useEffect, useState } from "react";
import { attempt } from "@/stores/failure-store";
import {
  $connection,
  $viewer,
  loadConnection,
  signOut,
} from "@/stores/viewer-store";

type Props = {
  open: boolean;
};

/** What a person types into a terminal once and never thinks about again. */
const connectCommand = (mcpUrl: string): string =>
  `claude mcp add --transport http knife ${mcpUrl}`;

/**
 * The foot of the panel: who is signed in, and how to hand an agent the same
 * reach. Projects are shared one by one on the project itself, so nothing
 * here decides who sees what.
 */
export const ViewerSection = ({ open }: Props): JSX.Element | null => {
  const viewer = useStore($viewer);
  const connection = useStore($connection);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      attempt(loadConnection());
    }
  }, [open]);

  if (!viewer) {
    return null;
  }

  const command = connection ? connectCommand(connection.mcpUrl) : "";

  const copy = (): void => {
    attempt(
      (async () => {
        await navigator.clipboard.writeText(command);
        setCopied(true);
      })(),
    );
  };

  return (
    <div
      className="flex shrink-0 flex-col gap-4 border-t border-line p-3"
      data-testid="viewer-section"
    >
      <p className="truncate text-xs text-faint">{viewer.email}</p>

      <div>
        <h3 className="mb-1 text-xs tracking-wider text-faint uppercase">
          Connect an agent
        </h3>
        <p className="mb-2 text-xs text-faint">
          Run this once. Your agent will ask you to sign in, and will then reach
          the same projects you do.
        </p>
        <code className="mb-2 block rounded-md border border-line p-2 text-xs break-all">
          {command || "…"}
        </code>
        <button
          className="w-full py-1 text-xs"
          disabled={!command}
          onClick={copy}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <button
        className="w-full py-1 text-xs text-faint"
        onClick={() => {
          attempt(signOut());
        }}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
};
