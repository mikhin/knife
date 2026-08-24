import { type FormEvent, type JSX, useEffect, useState } from "react";
import { Dialog } from "@/components/dialog";
import { projectsApi } from "@/api/projects-api";
import { attempt } from "@/stores/failure-store";
import type { Guest, Project } from "@knife/contract";

type Props = {
  onClose: () => void;
  project: Project;
};

/**
 * Sharing happens on one project at a time, which is the whole model: being
 * let into a universe says nothing about the others standing next to it.
 */
export const ShareDialog = ({ onClose, project }: Props): JSX.Element => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [email, setEmail] = useState("");

  const reload = (): void => {
    attempt(
      (async () => {
        setGuests(await projectsApi.guests(project.id));
      })(),
    );
  };

  useEffect(reload, [project.id]);

  const invite = (event: FormEvent): void => {
    event.preventDefault();
    const address = email.trim();
    if (!address) {
      return;
    }

    attempt(
      (async () => {
        await projectsApi.invite(project.id, address);
        setEmail("");
        setGuests(await projectsApi.guests(project.id));
      })(),
    );
  };

  const revoke = (address: string): void => {
    attempt(
      (async () => {
        await projectsApi.revoke(project.id, address);
        setGuests(await projectsApi.guests(project.id));
      })(),
    );
  };

  return (
    <Dialog onClose={onClose} title={`Share “${project.name}”`}>
      <p className="mb-3 text-xs text-faint">
        Whoever you name here reaches this project and nothing else of yours.
        They can read it, add to it and delete from it; renaming, deleting and
        this list stay with you.
      </p>

      <ul className="mb-3" data-testid="guest-list">
        {guests.length === 0 ? (
          <li className="py-1 text-xs text-faint">Nobody else, so far.</li>
        ) : (
          guests.map((guest) => (
            <li
              className="flex items-center justify-between gap-2 py-1 text-xs"
              key={guest.email}
            >
              <span className="truncate">{guest.email}</span>
              <button
                aria-label={`Remove ${guest.email}`}
                className="shrink-0 border-transparent px-1 text-faint hover:border-dup hover:text-dup"
                onClick={() => {
                  revoke(guest.email);
                }}
                type="button"
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>

      <form className="flex gap-2" onSubmit={invite}>
        <input
          className="min-w-0 flex-1 text-xs"
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder="somebody@example.com"
          type="email"
          value={email}
        />
        <button className="shrink-0 text-xs" type="submit">
          Invite
        </button>
      </form>
    </Dialog>
  );
};
