/**
 * What the API promises and the browser expects, written once. Copies of a
 * contract drift, and a drifted field is only found by the person it breaks.
 *
 * Declarations only: nothing here survives compilation, so both sides share
 * the shapes without sharing a build step.
 */

export type Chunk = {
  createdAt: string;
  id: string;
  projectId: string;
  text: string;
};

export type Project = {
  createdAt: string;
  id: string;
  /** False when this project belongs to somebody who invited you into it. */
  mine: boolean;
  name: string;
  /** The address of whoever owns it — yours, on your own projects. */
  owner: string;
};

/** Who is asking, as far as the browser needs to know. */
export type Viewer = {
  email: string;
  userId: string;
};

/** Somebody invited to one project. */
export type Guest = {
  email: string;
  since: string;
};

/** Where an agent is told to connect, as this server knows its own address. */
export type Connection = {
  mcpUrl: string;
};

export type LintTool = "harper" | "proselint" | "textlint" | "vale";

export type LintFinding = {
  chunkId: string;
  length: number;
  message: string;
  offset: number;
  rule: string;
  severity: "error" | "suggestion" | "warning";
  tool: LintTool;
};

export type LintHealth = {
  available: boolean;
  reason?: string;
  tools: string[];
};

export type LintReport = LintHealth & {
  findings: LintFinding[];
};
