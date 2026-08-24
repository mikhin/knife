import { useStore } from "@nanostores/react";
import { type FormEvent, type JSX, useEffect, useState } from "react";
import { attempt } from "@/stores/failure-store";
import {
  $connection,
  $team,
  $viewer,
  inviteTeammate,
  loadTeam,
  removeTeammate,
  signOut,
} from "@/stores/viewer-store";

type Props = {
  open: boolean;
};

/** What a person types into a terminal once and never thinks about again. */
const connectCommand = (mcpUrl: string): string =>
  `claude mcp add --transport http knife ${mcpUrl}`;

/**
 * The foot of the projects panel rather than a panel of its own. Whose
 * universes these are, and who else may read them, is the same question as
 * which universes exist — two drawers to answer it was one too many.
 */
export const TeamSection = ({ open }: Props): JSX.Element | null => {
  const viewer = useStore($viewer);
  const team = useStore($team);
  const connection = useStore($connection);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      attempt(loadTeam());
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

  const invite = (event: FormEvent): void => {
    event.preventDefault();
    const address = email.trim();
    if (address) {
      attempt(
        (async () => {
          await inviteTeammate(address);
          setEmail("");
        })(),
      );
    }
  };

  return (
    <div
      className="flex shrink-0 flex-col gap-4 border-t border-line p-3"
      data-testid="team-section"
    >
      <div>
        <p className="truncate">{viewer.organization.name}</p>
        <p className="truncate text-xs text-faint">
          {viewer.email} · {viewer.role}
        </p>
      </div>

      <div>
        <h3 className="mb-1 text-xs tracking-wider text-faint uppercase">
          Connect an agent
        </h3>
        <p className="mb-2 text-xs text-faint">
          Run this once. Your agent will ask you to sign in, and will then see
          only this team&apos;s universes.
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

      <div>
        <h3 className="mb-1 text-xs tracking-wider text-faint uppercase">
          Teammates
        </h3>
        <ul className="mb-2 max-h-32 overflow-y-auto">
          {team.map((mate) => (
            <li
              className="flex items-center justify-between gap-2 py-1 text-xs"
              key={mate.memberId}
            >
              <span className={`truncate ${mate.joined ? "" : "text-faint"}`}>
                {mate.email}
                {mate.joined ? "" : " · invited"}
              </span>
              {viewer.role === "owner" && mate.memberId !== viewer.memberId ? (
                <button
                  aria-label={`Remove ${mate.email}`}
                  className="shrink-0 border-transparent px-1 text-faint hover:border-dup hover:text-dup"
                  onClick={() => {
                    attempt(removeTeammate(mate.memberId));
                  }}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {viewer.role === "owner" ? (
          <form className="flex gap-2" onSubmit={invite}>
            <input
              className="min-w-0 flex-1 text-xs"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              placeholder="teammate@example.com"
              type="email"
              value={email}
            />
            <button className="shrink-0 text-xs" type="submit">
              Invite
            </button>
          </form>
        ) : null}
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
