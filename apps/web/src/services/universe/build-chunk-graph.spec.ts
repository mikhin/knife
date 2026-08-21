import type { Chunk } from "@knife/contract";
import { describe, expect, it } from "vitest";
import { buildChunkGraph } from "@/services/universe/build-chunk-graph";
import type { DuplicatePair } from "@/types/universe";

const chunk = (id: string, text: string): Chunk => ({
  createdAt: "2026-08-21T10:00:00.000Z",
  id,
  projectId: "universe",
  text,
});

const pair = (
  firstId: string,
  secondId: string,
  similarity: number,
): DuplicatePair => ({
  firstId,
  polarityDiffers: false,
  secondId,
  sharedWords: ["shift"],
  similarity,
});

const noMarks = { dangling: new Set<string>(), water: new Set<string>() };

describe("buildChunkGraph", () => {
  it("draws a node per chunk and an edge per duplicate pair", () => {
    const graph = buildChunkGraph(
      [
        chunk("a", "A shift starts at eight."),
        chunk("b", "A shift ends late."),
      ],
      [pair("a", "b", 0.6)],
      noMarks,
    );

    expect(graph.nodes.map((node) => node.id).toSorted()).toEqual(["a", "b"]);
    expect(graph.links).toEqual([
      { similarity: 0.6, source: "a", target: "b" },
    ]);
  });

  it("carries the verdicts onto the nodes", () => {
    const graph = buildChunkGraph(
      [chunk("wet", "It is what it is."), chunk("lonely", "Peacocks roam.")],
      [],
      { dangling: new Set(["lonely"]), water: new Set(["wet"]) },
    );

    const byId = new Map(graph.nodes.map((node) => [node.id, node]));

    expect(byId.get("wet")?.isWater).toBe(true);
    expect(byId.get("wet")?.isDangling).toBe(false);
    expect(byId.get("lonely")?.isDangling).toBe(true);
  });

  it("shortens a long chunk into a preview", () => {
    const long = "word ".repeat(60).trim();
    const [node] = buildChunkGraph([chunk("a", long)], [], noMarks).nodes;

    expect(node?.preview.endsWith("...")).toBe(true);
    expect(node?.preview.length).toBeLessThan(long.length);
  });

  it("leaves a short chunk whole", () => {
    const [node] = buildChunkGraph(
      [chunk("a", "A shift starts at eight.")],
      [],
      noMarks,
    ).nodes;

    expect(node?.preview).toBe("A shift starts at eight.");
  });

  it("spends the node budget on chunks a check has something to say about", () => {
    const crowd = Array.from({ length: 1300 }, (_, position) =>
      chunk(`filler-${position}`, `Filler number ${position}.`),
    );
    const graph = buildChunkGraph(
      [...crowd, chunk("dup-a", "A shift."), chunk("dup-b", "A shift.")],
      [pair("dup-a", "dup-b", 0.9)],
      { dangling: new Set(["filler-1299"]), water: new Set(["filler-0"]) },
    );

    const drawn = new Set(graph.nodes.map((node) => node.id));

    expect(drawn.has("dup-a")).toBe(true);
    expect(drawn.has("dup-b")).toBe(true);
    expect(drawn.has("filler-0")).toBe(true);
    expect(drawn.has("filler-1299")).toBe(true);
    expect(graph.nodes.length).toBeLessThan(crowd.length);
  });

  it("says how many chunks it left off the canvas", () => {
    const crowd = Array.from({ length: 1300 }, (_, position) =>
      chunk(`filler-${position}`, `Filler number ${position}.`),
    );

    const graph = buildChunkGraph(crowd, [], noMarks);

    expect(graph.droppedNodes).toBe(crowd.length - graph.nodes.length);
    expect(graph.droppedNodes).toBeGreaterThan(0);
  });

  it("has nothing to report when the whole universe fits", () => {
    const graph = buildChunkGraph([chunk("a", "A rule.")], [], noMarks);

    expect(graph.droppedNodes).toBe(0);
  });

  it("drops an edge whose chunk did not make it onto the canvas", () => {
    const crowd = Array.from({ length: 1300 }, (_, position) =>
      chunk(`filler-${position}`, `Filler number ${position}.`),
    );
    const graph = buildChunkGraph(crowd, [pair("filler-0", "missing", 0.9)], {
      dangling: new Set<string>(),
      water: new Set<string>(),
    });

    expect(graph.links).toEqual([]);
  });
});
