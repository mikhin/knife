import { describe, expect, it } from "vitest";
import { buildUniverseIndex } from "@/services/universe/build-universe-index";
import { buildWordGraph } from "@/services/universe/build-word-graph";
import type { Chunk } from "@knife/contract";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

describe("buildWordGraph", () => {
  it("puts every form of a word on one node", () => {
    const graph = buildWordGraph(
      buildUniverseIndex([
        chunk("a", "A shift starts at eight."),
        chunk("b", "All shifts are approved by the manager."),
        chunk("c", "The manager keeps shifting the schedule."),
      ]),
    );

    const shiftNodes = graph.nodes.filter((node) => node.stem === "shift");

    expect(shiftNodes).toHaveLength(1);
    expect(shiftNodes[0]?.chunkCount).toBe(3);
  });

  it("labels a node with the form that is written most often", () => {
    const graph = buildWordGraph(
      buildUniverseIndex([
        chunk("a", "Shifts are approved."),
        chunk("b", "Shifts are published."),
        chunk("c", "A shift is approved."),
      ]),
    );

    expect(graph.nodes.find((node) => node.stem === "shift")?.label).toBe(
      "shifts",
    );
  });

  it("links words that keep appearing in the same chunk", () => {
    const graph = buildWordGraph(
      buildUniverseIndex([
        chunk("a", "The night auditor works late."),
        chunk("b", "Every night auditor files a report."),
        chunk("c", "Payroll exports leave on Monday."),
      ]),
    );

    const link = graph.links.find(
      (candidate) =>
        [candidate.source, candidate.target].toSorted().join(" ") ===
        "auditor night",
    );

    expect(link?.weight).toBe(2);
  });

  it("reports what it left out instead of pretending to show everything", () => {
    const graph = buildWordGraph(
      buildUniverseIndex([chunk("a", "The auditor files a report.")]),
    );

    expect(graph.droppedNodes).toBe(0);
    expect(graph.droppedLinks).toBe(0);
  });
});
