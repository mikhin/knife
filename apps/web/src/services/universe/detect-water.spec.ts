import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "@/services/universe/build-universe-index";
import { detectWater } from "@/services/universe/detect-water";
import type { Chunk } from "@knife/contract";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

const findingsFor = (chunks: Chunk[], id: string) =>
  detectWater(buildUniverseIndex(chunks)).find(
    (verdict) => verdict.chunkId === id,
  )?.findings ?? [];

describe("detectWater", () => {
  it("names the rule that fired instead of just marking the chunk", () => {
    const findings = findingsFor(
      [
        chunk("water", "It should be noted that this is what it is about."),
        chunk("solid", "The night auditor closes the shift report."),
      ],
      "water",
    );

    expect(findings.map((finding) => finding.rule)).toContain(
      "stop-word-flood",
    );
    expect(findings[0]?.explanation).toBeTruthy();
  });

  it("shows the numbers the rule fired on", () => {
    const findings = findingsFor(
      [chunk("water", "There is a thing that is there for it to be about.")],
      "water",
    );

    expect(findings[0]?.evidence).toMatch(/\d+ of \d+ words/);
  });

  it("flags a chunk with almost nothing in it", () => {
    const findings = findingsFor([chunk("thin", "Overview")], "thin");

    expect(findings.map((finding) => finding.rule)).toContain("too-few-terms");
  });

  it("flags a chunk whose every word is everywhere in the universe", () => {
    const filler = Array.from({ length: 24 }, (_, position) =>
      chunk(`filler-${position}`, "The report covers the shift and the week."),
    );

    const findings = findingsFor(
      [...filler, chunk("general", "The report covers the week.")],
      "general",
    );

    expect(findings.map((finding) => finding.rule)).toContain("no-rare-terms");
  });

  it("flags a chunk that circles the same few words", () => {
    const findings = findingsFor(
      [
        chunk(
          "circular",
          "The schedule drives the schedule and the schedule drives the schedule that the schedule drives.",
        ),
      ],
      "circular",
    );

    expect(findings.map((finding) => finding.rule)).toContain("repeats-itself");
  });

  it("leaves a chunk that carries terms out of the verdicts entirely", () => {
    const verdicts = detectWater(
      buildUniverseIndex([
        chunk("solid", "The night auditor closes the shift report."),
        chunk("water", "It should be noted that this is what it is about."),
      ]),
    );

    expect(verdicts.map((verdict) => verdict.chunkId)).toEqual(["water"]);
  });

  it("says nothing about a chunk that carries terms", () => {
    const findings = findingsFor(
      [
        chunk(
          "solid",
          "The night auditor closes the shift report before midnight.",
        ),
      ],
      "solid",
    );

    expect(findings).toEqual([]);
  });
});
