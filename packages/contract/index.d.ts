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
  chunkCount: number;
  createdAt: string;
  id: string;
  name: string;
};

export type LintTool = "proselint" | "textlint" | "vale";

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
