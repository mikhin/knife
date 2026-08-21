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

/** Настоящие требования, а не шум: на них правила и калибруются. */
const REQUIREMENTS = [
  "The night auditor closes the shift report before midnight.",
  "Breaks are unpaid and overtime is approved by the property manager.",
  "Housekeeping restocks the minibar on arrival days.",
  "Occupancy is rooms sold divided by total rooms.",
  "A pinned pattern materialises when the week is published.",
  "Corporate access bypasses every property scope.",
  "Payroll exports leave on the first working day of the month.",
  "The forecast drives the quota lookup for each position.",
  "An invite is revoked before the membership exists.",
  "Published snapshots are versioned and never rewritten.",
  "A departure day frees the room for the evening turnover.",
  "Laundry counts linen by weight, not by piece.",
  "The concierge logs every valet request against the room.",
  "Banquet inventory is reconciled after each event.",
  "Room revenue divided by rooms sold gives the average daily rate.",
  "Stayovers are rooms sold minus arrivals.",
  "A shift type carries default times and an unpaid break.",
  "Department admins manage shifts only in their own department.",
  "Past weeks are read-only and cannot be dragged.",
  "Deactivating a member preserves their published schedules.",
];

describe("water calibration", () => {
  it("says nothing about most of a corpus of real requirements", () => {
    const chunks = REQUIREMENTS.map((text, position) =>
      chunk(`req-${position}`, text),
    );

    const water = detectWater(buildUniverseIndex(chunks));

    expect(water.length / chunks.length).toBeLessThan(0.25);
  });

  it("still picks the watery sentence out of that corpus", () => {
    const chunks = [
      ...REQUIREMENTS.map((text, position) => chunk(`req-${position}`, text)),
      chunk("water", "It should be noted that this is what it is about."),
    ];

    const water = detectWater(buildUniverseIndex(chunks));

    expect(water.map((verdict) => verdict.chunkId)).toContain("water");
  });

  it("does not drown a corpus whose words simply repeat", () => {
    const vocabulary = ["shift", "auditor", "payroll", "quota", "roster"];
    const chunks = Array.from({ length: 200 }, (_, position) =>
      chunk(
        `c${position}`,
        `The ${vocabulary[position % 5]} report covers ${vocabulary[(position * 3) % 5]} for week ${position}.`,
      ),
    );

    const water = detectWater(buildUniverseIndex(chunks));

    expect(water.length / chunks.length).toBeLessThan(0.5);
  });
});

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
