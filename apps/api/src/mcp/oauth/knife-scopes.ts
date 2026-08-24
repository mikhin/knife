/**
 * Two, because the pair is the whole point: an agent that reads the universe
 * and an agent that removes from it should not be the same grant. Deletion
 * has no undo, so nobody hands it over by accident along with the reading.
 */
export const READ_SCOPE = "knife:read";
export const WRITE_SCOPE = "knife:write";

export const KNIFE_SCOPES = [READ_SCOPE, WRITE_SCOPE] as const;

export const SCOPE_MEANING: Record<string, string> = {
  [READ_SCOPE]: "Read your team's universes: chunks, repeats, words",
  [WRITE_SCOPE]: "Delete chunks and add new ones. Deleting cannot be undone",
};
