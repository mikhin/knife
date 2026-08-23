import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "./chunk-markdown";

describe("chunkMarkdown", () => {
  it("cuts a paragraph on dots, semicolons and colons", () => {
    const chunks = chunkMarkdown(
      "The shift starts at eight. Breaks are unpaid; overtime is not. Rule: the manager approves it.",
    );

    expect(chunks).toEqual([
      "The shift starts at eight.",
      "Breaks are unpaid;",
      "overtime is not.",
      "Rule:",
      "the manager approves it.",
    ]);
  });

  it("keeps decimals, clock times and versions whole", () => {
    const chunks = chunkMarkdown(
      "Occupancy is 87.5 percent at 12:30 in release v1.2.3 of the report.",
    );

    expect(chunks).toEqual([
      "Occupancy is 87.5 percent at 12:30 in release v1.2.3 of the report.",
    ]);
  });

  it("does not cut after an abbreviation", () => {
    const chunks = chunkMarkdown(
      "Some roles, e.g. the night auditor, are exempt.",
    );

    expect(chunks).toEqual(["Some roles, e.g. the night auditor, are exempt."]);
  });

  it("cuts table rows the same way it cuts prose", () => {
    const chunks = chunkMarkdown(
      [
        "| Role | Hours |",
        "| --- | --- |",
        "| Night auditor | Eight hours. Breaks unpaid |",
      ].join("\n"),
    );

    expect(chunks).toEqual([
      "Role — Hours",
      "Night auditor — Eight hours.",
      "Breaks unpaid",
    ]);
  });

  it("cuts a table that has no leading pipe", () => {
    const chunks = chunkMarkdown(
      [
        "Role | Duty",
        "--- | ---",
        "Night auditor | Closes the shift report",
      ].join("\n"),
    );

    expect(chunks).toEqual([
      "Role — Duty",
      "Night auditor — Closes the shift report",
    ]);
  });

  it("leaves a sentence that merely contains a pipe alone", () => {
    const chunks = chunkMarkdown("Run pnpm lint | tee log.txt to keep it.");

    expect(chunks).toEqual(["Run pnpm lint | tee log.txt to keep it."]);
  });

  it("turns headings and list items into chunks of their own", () => {
    const chunks = chunkMarkdown(
      [
        "# Scheduling rules",
        "",
        "- A shift needs a position",
        "- A week opens by itself",
      ].join("\n"),
    );

    expect(chunks).toEqual([
      "Scheduling rules",
      "A shift needs a position",
      "A week opens by itself",
    ]);
  });

  it("drops markup and keeps only what a reader sees", () => {
    const chunks = chunkMarkdown(
      "A **published** snapshot is [immutable](https://example.com/docs) forever.",
    );

    expect(chunks).toEqual(["A published snapshot is immutable forever."]);
  });

  it("keeps a fenced code block in one piece", () => {
    const chunks = chunkMarkdown(
      [
        "Example follows.",
        "",
        "```ts",
        "const a = 1.5;",
        "const b = a;",
        "```",
      ].join("\n"),
    );

    expect(chunks).toEqual([
      "Example follows.",
      "const a = 1.5;\nconst b = a;",
    ]);
  });

  it("drops template shortcodes left by a site generator", () => {
    const chunks = chunkMarkdown(
      "{% sidenote %} The rule stands. {% endsidenote %}",
    );

    expect(chunks).toEqual(["The rule stands."]);
  });

  it("keeps the text after a fence nobody closed", () => {
    const chunks = chunkMarkdown(
      [
        "A rule stands.",
        "",
        "```ts",
        "const a = 1;",
        "",
        "Another rule stands.",
      ].join("\n"),
    );

    expect(chunks).toContain("A rule stands.");
    expect(chunks).toContain("Another rule stands.");
  });

  it("throws away front matter", () => {
    const chunks = chunkMarkdown(
      ["---", "title: Rules", "---", "", "The rule stands."].join("\n"),
    );

    expect(chunks).toEqual(["The rule stands."]);
  });
});
