import { describe, expect, it } from "vitest";
import { detectPastedFormat } from "./detect-pasted-format";

describe("detectPastedFormat", () => {
  it("reads a heading as markdown", () => {
    expect(detectPastedFormat("# Scheduling rules\n\nA shift starts.")).toBe(
      "markdown",
    );
  });

  it("reads a table as markdown", () => {
    expect(detectPastedFormat("Role | Duty\n--- | ---\nAuditor | Closes")).toBe(
      "markdown",
    );
  });

  it("reads a fence as markdown", () => {
    expect(detectPastedFormat("Example:\n\n```ts\nconst a = 1;\n```")).toBe(
      "markdown",
    );
  });

  it("reads a list as markdown", () => {
    expect(detectPastedFormat("- A shift needs a position")).toBe("markdown");
  });

  it("reads a link as markdown", () => {
    expect(detectPastedFormat("See [the rule](https://example.com).")).toBe(
      "markdown",
    );
  });

  it("leaves ordinary prose as plain text", () => {
    expect(
      detectPastedFormat(
        "The night auditor closes the shift report before midnight.",
      ),
    ).toBe("text");
  });

  it("does not call a stray hash markdown", () => {
    expect(detectPastedFormat("Room #14 is out of service.")).toBe("text");
  });

  it("does not call a stray pipe markdown", () => {
    expect(detectPastedFormat("Run pnpm lint | tee log.txt")).toBe("text");
  });

  it("has nothing to read in an empty paste", () => {
    expect(detectPastedFormat("")).toBe("text");
  });
});
